import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';
import { AdminLoginDto } from './dto';
import type { AdminClaims } from './admin-auth.types';

export const ADMIN_SESSION_COOKIE = 'sanjari_admin_session';

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!admin || admin.status !== 'active' || !(await verify(admin.passwordHash, dto.password))) {
      throw new UnauthorizedException({
        code: 'ADMIN_INVALID_CREDENTIALS',
        message: 'Admin credentials are invalid.',
      });
    }
    if (admin.mfaEnabled) {
      const provider = this.config.get<string>('ADMIN_MFA_PROVIDER', 'disabled');
      if (provider === 'disabled' || !dto.mfaCode) {
        throw new UnauthorizedException({
          code: 'ADMIN_MFA_REQUIRED',
          message: 'Admin MFA verification is required.',
        });
      }
      throw new UnauthorizedException({
        code: 'ADMIN_MFA_PROVIDER_UNAVAILABLE',
        message: 'Admin MFA provider is not configured.',
      });
    }
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        sessionHash: hash(sessionToken),
        csrfTokenHash: hash(csrfToken),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    return {
      sessionToken,
      csrfToken,
      sessionId: session.id,
      admin: this.claims(admin),
    };
  }

  async authenticate(sessionToken: string) {
    const session = await this.prisma.adminSession.findUnique({
      where: { sessionHash: hash(sessionToken) },
      include: {
        adminUser: {
          include: {
            roles: {
              include: { role: { include: { permissions: { include: { permission: true } } } } },
            },
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.adminUser.status !== 'active'
    ) {
      throw new UnauthorizedException({
        code: 'ADMIN_SESSION_INVALID',
        message: 'Admin session is invalid.',
      });
    }
    return {
      sessionId: session.id,
      admin: this.claims(session.adminUser),
      csrfTokenHash: session.csrfTokenHash,
    };
  }

  async logout(sessionId: string) {
    await this.prisma.adminSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyCsrf(sessionId: string, token: string | undefined) {
    if (!token)
      throw new UnauthorizedException({
        code: 'ADMIN_CSRF_REQUIRED',
        message: 'CSRF token is required.',
      });
    const session = await this.prisma.adminSession.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { csrfTokenHash: true },
    });
    if (!session || session.csrfTokenHash !== hash(token))
      throw new UnauthorizedException({
        code: 'ADMIN_CSRF_INVALID',
        message: 'CSRF token is invalid.',
      });
  }

  private claims(admin: {
    id: string;
    email: string;
    displayName: string;
    roles: Array<{ role: { permissions: Array<{ permission: { key: string } }> } }>;
  }): AdminClaims {
    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      permissions: admin.roles.flatMap((role) =>
        role.role.permissions.map((item) => item.permission.key),
      ),
    };
  }
}
