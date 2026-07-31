import { BadRequestException, Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';
import { SmsService } from './sms.service';

const phoneCodeLifetimeMs = 10 * 60 * 1000;
const maximumPhoneAttempts = 5;

function invalidPhoneCode(): never {
  throw new BadRequestException({
    code: 'INVALID_PHONE_CODE',
    message: 'The phone verification code is invalid or expired.',
  });
}

@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async issue(userId: string, phoneNumber: string): Promise<void> {
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await hash(code);
    const expiresAt = new Date(Date.now() + phoneCodeLifetimeMs);
    await this.prisma.$transaction(async (tx) => {
      await tx.phoneVerification.updateMany({
        where: { userId, phoneNumber, verifiedAt: null },
        data: { expiresAt },
      });
      await tx.phoneVerification.create({ data: { userId, phoneNumber, codeHash, expiresAt } });
    });
    await this.sms.sendOtp(phoneNumber, code);
  }

  async issueForExistingPhone(phoneNumber: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (user) await this.issue(user.id, phoneNumber);
  }

  async verifyForUser(
    userId: string,
    phoneNumber: string,
    code: string,
  ): Promise<{ userId: string }> {
    const verification = await this.findValidAttempt(userId, phoneNumber);
    await this.checkCode(verification.id, verification.codeHash, code);
    return this.complete(verification.id, userId, phoneNumber);
  }

  async verifyForLogin(phoneNumber: string, code: string): Promise<{ userId: string }> {
    const verification = await this.findValidAttempt(undefined, phoneNumber);
    await this.checkCode(verification.id, verification.codeHash, code);
    return this.complete(verification.id, verification.userId, phoneNumber);
  }

  private async findValidAttempt(userId: string | undefined, phoneNumber: string) {
    const verification = await this.prisma.phoneVerification.findFirst({
      where: { ...(userId ? { userId } : {}), phoneNumber, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !verification ||
      verification.expiresAt <= new Date() ||
      verification.attempts >= maximumPhoneAttempts
    )
      invalidPhoneCode();
    return verification;
  }

  private async checkCode(id: string, codeHash: string, code: string): Promise<void> {
    let valid = false;
    try {
      valid = await verify(codeHash, code);
    } catch {
      valid = false;
    }
    if (!valid) {
      await this.prisma.phoneVerification.updateMany({
        where: { id, attempts: { lt: maximumPhoneAttempts } },
        data: { attempts: { increment: 1 } },
      });
      invalidPhoneCode();
    }
  }

  private async complete(
    id: string,
    userId: string,
    phoneNumber: string,
  ): Promise<{ userId: string }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.phoneVerification.update({ where: { id }, data: { verifiedAt: new Date() } });
      await tx.user.update({ where: { id: userId }, data: { phoneNumber } });
      await tx.userCredential.upsert({
        where: { type_identifier: { type: 'phone', identifier: phoneNumber } },
        create: { userId, type: 'phone', identifier: phoneNumber, verifiedAt: new Date() },
        update: { userId, verifiedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { userId, actorType: 'user', action: 'auth.phone_verified' },
      });
    });
    return { userId };
  }
}
