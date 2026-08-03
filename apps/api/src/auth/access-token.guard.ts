import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/database/prisma.service';

export type AccessTokenClaims = { sub: string; email: string; type: 'access' };
export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AccessTokenClaims;
};

const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly lastSeen = new Map<string, number>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (claims.type !== 'access' || !claims.sub) {
        throw new Error('Invalid access token type');
      }
      request.user = claims;
      this.markActive(claims.sub);
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }
  }

  private markActive(userId: string): void {
    const now = Date.now();
    const last = this.lastSeen.get(userId) ?? 0;
    if (now - last < ACTIVITY_THROTTLE_MS) return;
    this.lastSeen.set(userId, now);
    void this.prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
  }
}
