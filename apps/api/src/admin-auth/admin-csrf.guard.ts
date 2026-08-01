import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import type { AdminRequest } from './admin-auth.types';

@Injectable()
export class AdminCsrfGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    await this.auth.verifyCsrf(request.sessionId!, request.headers['x-csrf-token']);
    return true;
  }
}
