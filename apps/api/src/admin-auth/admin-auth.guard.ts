import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService, ADMIN_SESSION_COOKIE } from './admin-auth.service';
import type { AdminRequest } from './admin-auth.types';

function cookieValue(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = cookieValue(request.headers.cookie, ADMIN_SESSION_COOKIE);
    if (!token)
      throw new UnauthorizedException({
        code: 'ADMIN_AUTH_REQUIRED',
        message: 'Admin authentication is required.',
      });
    const session = await this.auth.authenticate(token);
    request.admin = session.admin;
    request.sessionId = session.sessionId;
    return true;
  }
}
