import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../common/database/prisma.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import { PhoneVerificationService } from './phone-verification.service';

const minimumAge = 18;

function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDelta = now.getUTCDate() - dateOfBirth.getUTCDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age;
}

const registerSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(12).max(128),
    dateOfBirth: z.coerce.date(),
    acceptedTermsVersion: z.string().min(1),
    acceptedPrivacyVersion: z.string().min(1),
    confirmedAdult: z.literal(true),
    locale: z.enum(['en', 'sw']).default('en'),
  })
  .superRefine((value, ctx) => {
    if (calculateAge(value.dateOfBirth) < minimumAge) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateOfBirth'],
        message: 'You must be at least 18 years old to use Sanjari.',
      });
    }
  });

type RegisterInput = z.infer<typeof registerSchema>;

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
  deviceId: z.string().min(8).max(128),
});

type LoginInput = z.infer<typeof loginSchema>;

type SessionResponse = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type IssuedTokens = Omit<SessionResponse, 'userId'>;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  async register(
    input: RegisterInput,
  ): Promise<{ userId: string; onboardingStatus: string; emailVerificationRequired: true }> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Registration details are invalid.',
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const passwordHash = await hash(parsed.data.password, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    let user: { id: string; profile: { onboardingStatus: string } | null };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: parsed.data.email,
            locale: parsed.data.locale,
            dateOfBirth: parsed.data.dateOfBirth,
            ageEligibilityStatus: 'confirmed_adult',
            status: 'pending_verification',
            credentials: {
              create: {
                type: 'password',
                identifier: parsed.data.email,
                secretHash: passwordHash,
              },
            },
            profile: {
              create: {
                moderationStatus: 'pending',
                onboardingStatus: 'registration_started',
              },
            },
            legalAcceptances: {
              create: [
                { documentType: 'terms', version: parsed.data.acceptedTermsVersion },
                { documentType: 'privacy', version: parsed.data.acceptedPrivacyVersion },
              ],
            },
            auditLogs: {
              create: {
                action: 'auth.register',
                actorType: 'user',
                metadata: { ageEligibilityStatus: 'confirmed_adult' },
              },
            },
          },
          select: { id: true, profile: { select: { onboardingStatus: true } } },
        });

        return created;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: 'An account already exists for this email.',
        });
      }
      throw error;
    }

    await this.emailVerification.issue(user.id, parsed.data.email);

    return {
      userId: user.id,
      onboardingStatus: user.profile?.onboardingStatus ?? 'registration_started',
      emailVerificationRequired: true,
    };
  }

  async login(input: LoginInput): Promise<SessionResponse> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Login details are invalid.',
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const credential = await this.prisma.userCredential.findUnique({
      where: { type_identifier: { type: 'password', identifier: parsed.data.email } },
      include: { user: true },
    });

    if (
      !credential?.secretHash ||
      !credential.verifiedAt ||
      !['active', 'deactivated'].includes(credential.user.status) ||
      !(await verify(credential.secretHash, parsed.data.password))
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
    await this.reactivateIfNeeded(credential.user.id, credential.user.status);

    const session = {
      userId: credential.userId,
      ...(await this.issueSession(credential.userId, credential.user.email, parsed.data.deviceId)),
    };
    await this.recordLoginRisk(credential.userId, parsed.data.deviceId);
    return session;
  }

  /** Logging back in after a self-service deactivation restores the account automatically. */
  private async reactivateIfNeeded(userId: string, status: string): Promise<void> {
    if (status !== 'deactivated') return;
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
    await this.prisma.auditLog.create({
      data: { userId, actorType: 'user', action: 'account.reactivated' },
    });
  }

  async verifyEmail(email: string, code: string): Promise<{ userId: string }> {
    return this.emailVerification.verify(email, code);
  }

  async resendEmailVerification(email: string): Promise<void> {
    await this.emailVerification.resend(email);
  }

  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.emailVerification.requestChange(userId, user.email, newEmail);
  }

  async confirmEmailChange(
    userId: string,
    newEmail: string,
    code: string,
  ): Promise<{ email: string }> {
    return this.emailVerification.confirmChange(userId, newEmail, code);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.passwordReset.request(email);
  }

  async resetPassword(token: string, password: string): Promise<{ userId: string }> {
    return this.passwordReset.reset(token, password);
  }

  async requestPhoneVerification(userId: string, phoneNumber: string): Promise<void> {
    await this.phoneVerification.issue(userId, phoneNumber);
  }

  async verifyPhone(
    userId: string,
    phoneNumber: string,
    code: string,
  ): Promise<{ userId: string }> {
    return this.phoneVerification.verifyForUser(userId, phoneNumber, code);
  }

  async requestPhoneLogin(phoneNumber: string): Promise<void> {
    await this.phoneVerification.issueForExistingPhone(phoneNumber);
  }

  async verifyPhoneLogin(
    phoneNumber: string,
    code: string,
    deviceId: string,
  ): Promise<SessionResponse> {
    const { userId } = await this.phoneVerification.verifyForLogin(phoneNumber, code);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['active', 'deactivated'].includes(user.status)) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Phone number or code is incorrect.',
      });
    }
    await this.reactivateIfNeeded(user.id, user.status);
    return { userId, ...(await this.issueSession(userId, user.email, deviceId)) };
  }

  async refresh(refreshToken: string): Promise<SessionResponse> {
    const claims = await this.verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.userId !== claims.sub) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'The session is no longer valid.',
      });
    }

    if (session.revokedAt) {
      await this.revokeSessionFamily(session.tokenFamilyId, session.userId, 'auth.refresh_reuse');
      throw new UnauthorizedException({
        code: 'SESSION_REUSE_DETECTED',
        message: 'The session is no longer valid.',
      });
    }

    if (session.expiresAt <= new Date() || session.user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'The session is no longer valid.',
      });
    }

    const tokens = await this.createTokens(session.userId, session.user.email);
    try {
      await this.prisma.$transaction(async (tx) => {
        const revoked = await tx.userSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count !== 1) {
          throw new UnauthorizedException({
            code: 'SESSION_REUSE_DETECTED',
            message: 'The session is no longer valid.',
          });
        }
        await tx.userSession.create({
          data: {
            userId: session.userId,
            deviceId: session.deviceId,
            tokenFamilyId: session.tokenFamilyId,
            refreshTokenHash: hashToken(tokens.refreshToken),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.revokeSessionFamily(session.tokenFamilyId, session.userId, 'auth.refresh_reuse');
      }
      throw error;
    }

    return { userId: session.userId, ...tokens };
  }

  async logout(refreshToken: string): Promise<boolean> {
    const revoked = await this.prisma.userSession.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return revoked.count > 0;
  }

  async logoutAll(userId: string): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        actorType: 'user',
        action: 'auth.logout_all',
        metadata: { sessionCount: result.count },
      },
    });
    return result.count;
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, deviceId: true, createdAt: true, updatedAt: true, expiresAt: true },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count > 0)
      await this.prisma.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'auth.session_revoked',
          metadata: { sessionId },
        },
      });
    return result.count > 0;
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string; type: 'refresh' }> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; type: 'refresh' }>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (claims.type !== 'refresh' || !claims.sub) {
        throw new Error('Invalid refresh token type');
      }
      return claims;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'The session is no longer valid.',
      });
    }
  }

  private async revokeSessionFamily(
    tokenFamilyId: string,
    userId: string,
    action: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userSession.updateMany({
        where: { tokenFamilyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { userId, actorType: 'user', action, metadata: { tokenFamilyId } },
      }),
    ]);
  }

  private async issueSession(
    userId: string,
    email: string,
    deviceId = `registration-${userId}`,
  ): Promise<IssuedTokens> {
    const tokens = await this.createTokens(userId, email);
    await this.prisma.userSession.create({
      data: {
        userId,
        deviceId,
        refreshTokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return tokens;
  }

  private async recordLoginRisk(userId: string, deviceId: string): Promise<void> {
    const activeSessionCount = await this.prisma.userSession.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        actorType: 'user',
        action: 'auth.login',
        metadata: { deviceId, activeSessionCount },
      },
    });
    if (activeSessionCount >= 4)
      await this.prisma.riskSignal.create({
        data: {
          userId,
          type: 'multiple_active_sessions',
          severity: activeSessionCount >= 8 ? 'high' : 'medium',
          metadata: { deviceId, activeSessionCount },
        },
      });
  }

  private async createTokens(userId: string, email: string): Promise<IssuedTokens> {
    const expiresIn = 900;
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'access' },
      { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '30d' },
    );

    return { accessToken, refreshToken, expiresIn };
  }
}
