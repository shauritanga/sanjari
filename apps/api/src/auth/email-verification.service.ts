import { BadRequestException, Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';
import { EmailService } from './email.service';

const verificationLifetimeMs = 10 * 60 * 1000;
const maximumAttempts = 5;

function invalidCode(): never {
  throw new BadRequestException({
    code: 'INVALID_VERIFICATION_CODE',
    message: 'The verification code is invalid or expired.',
  });
}

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async issue(userId: string, email: string): Promise<void> {
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await hash(code);
    const expiresAt = new Date(Date.now() + verificationLifetimeMs);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.updateMany({
        where: { userId, email, verifiedAt: null },
        data: { expiresAt },
      });
      await tx.emailVerification.create({
        data: { userId, email, codeHash, expiresAt },
      });
    });

    await this.email.sendVerificationCode(email, code);
  }

  async verify(email: string, code: string): Promise<{ userId: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const verification = await this.prisma.emailVerification.findFirst({
      where: { email: normalizedEmail, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !verification ||
      verification.expiresAt <= new Date() ||
      verification.attempts >= maximumAttempts
    ) {
      invalidCode();
    }

    let valid = false;
    try {
      valid = await verify(verification.codeHash, code);
    } catch {
      valid = false;
    }

    if (!valid) {
      await this.prisma.emailVerification.updateMany({
        where: { id: verification.id, attempts: { lt: maximumAttempts } },
        data: { attempts: { increment: 1 } },
      });
      invalidCode();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      });
      await tx.userCredential.updateMany({
        where: { userId: verification.userId, type: 'password' },
        data: { verifiedAt: new Date() },
      });
      await tx.user.update({
        where: { id: verification.userId },
        data: { status: 'active' },
      });
      await tx.auditLog.create({
        data: {
          userId: verification.userId,
          actorType: 'user',
          action: 'auth.email_verified',
        },
      });
    });

    return { userId: verification.userId };
  }

  async resend(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && user.status === 'pending_verification') {
      await this.issue(user.id, user.email);
    }
  }
}
