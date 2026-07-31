import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type AccessTokenClaims = { sub: string; email: string; type: 'access' };
export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AccessTokenClaims;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }
  }
}
