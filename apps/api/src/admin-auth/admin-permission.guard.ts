import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import type { AdminRequest } from './admin-auth.types';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const required = (Reflect.getMetadata('adminPermission', context.getHandler()) ??
      Reflect.getMetadata('adminPermission', context.getClass())) as string | undefined;
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (!required || request.admin?.permissions.includes(required)) return true;
    throw new ForbiddenException({
      code: 'ADMIN_PERMISSION_REQUIRED',
      message: 'Admin permission is required.',
    });
  }
}
