import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../common/database/prisma.service';

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
    locale: z.enum(['en', 'sw']).default('en')
  })
  .superRefine((value, ctx) => {
    if (calculateAge(value.dateOfBirth) < minimumAge) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateOfBirth'],
        message: 'You must be at least 18 years old to use Sanjari.'
      });
    }
  });

type RegisterInput = z.infer<typeof registerSchema>;

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
  deviceId: z.string().min(8).max(128)
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
    private readonly config: ConfigService
  ) {}

  async register(input: RegisterInput): Promise<SessionResponse & { onboardingStatus: string }> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Registration details are invalid.',
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const passwordHash = await hash(parsed.data.password, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
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
          credentials: {
            create: {
              type: 'password',
              identifier: parsed.data.email,
              secretHash: passwordHash
            }
          },
          profile: {
            create: {
              moderationStatus: 'pending',
              onboardingStatus: 'registration_started'
            }
          },
          legalAcceptances: {
            create: [
              { documentType: 'terms', version: parsed.data.acceptedTermsVersion },
              { documentType: 'privacy', version: parsed.data.acceptedPrivacyVersion }
            ]
          },
          auditLogs: {
            create: {
              action: 'auth.register',
              actorType: 'user',
              metadata: { ageEligibilityStatus: 'confirmed_adult' }
            }
          }
        },
        select: { id: true, profile: { select: { onboardingStatus: true } } }
      });

        return created;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException({ code: 'ACCOUNT_EXISTS', message: 'An account already exists for this email.' });
      }
      throw error;
    }

    const tokens = await this.issueSession(user.id, parsed.data.email);

    return {
      userId: user.id,
      onboardingStatus: user.profile?.onboardingStatus ?? 'registration_started',
      ...tokens
    };
  }

  async login(input: LoginInput): Promise<SessionResponse> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Login details are invalid.',
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const credential = await this.prisma.userCredential.findUnique({
      where: { type_identifier: { type: 'password', identifier: parsed.data.email } },
      include: { user: true }
    });

    if (!credential?.secretHash || credential.user.status !== 'active' || !(await verify(credential.secretHash, parsed.data.password))) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    }

    return {
      userId: credential.userId,
      ...(await this.issueSession(credential.userId, credential.user.email, parsed.data.deviceId))
    };
  }

  private async issueSession(userId: string, email: string, deviceId = `registration-${userId}`): Promise<IssuedTokens> {
    const expiresIn = 900;
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'access' },
      { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn }
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '30d' }
    );

    await this.prisma.userSession.create({
      data: {
        userId,
        deviceId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return { accessToken, refreshToken, expiresIn };
  }
}
