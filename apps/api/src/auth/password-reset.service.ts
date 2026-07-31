import { BadRequestException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';
import { EmailService } from './email.service';

const resetLifetimeMs = 30 * 60 * 1000;

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function invalidReset(): never {
  throw new BadRequestException({
    code: 'INVALID_PASSWORD_RESET',
    message: 'The password reset link is invalid or expired.',
  });
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async request(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await this.prisma.userCredential.findUnique({
      where: { type_identifier: { type: 'password', identifier: normalizedEmail } },
      include: { user: true },
    });

    if (!credential || credential.user.status === 'deleted') {
      return;
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: credential.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordReset.create({
        data: {
          userId: credential.userId,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + resetLifetimeMs),
        },
      });
    });

    await this.email.sendPasswordReset(normalizedEmail, token);
  }

  async reset(token: string, password: string): Promise<{ userId: string }> {
    const reset = await this.prisma.passwordReset.findFirst({
      where: { tokenHash: hashResetToken(token), usedAt: null },
    });
    if (!reset || reset.expiresAt <= new Date()) {
      invalidReset();
    }

    const passwordHash = await hash(password, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      await tx.userCredential.updateMany({
        where: { userId: reset.userId, type: 'password' },
        data: { secretHash: passwordHash },
      });
      await tx.userSession.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { userId: reset.userId, actorType: 'user', action: 'auth.password_reset' },
      });
    });

    return { userId: reset.userId };
  }
}
