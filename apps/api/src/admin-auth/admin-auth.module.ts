import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminPermissionGuard } from './admin-permission.guard';
import { AdminCsrfGuard } from './admin-csrf.guard';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard, AdminPermissionGuard, AdminCsrfGuard],
  exports: [AdminAuthService, AdminAuthGuard, AdminPermissionGuard, AdminCsrfGuard],
})
export class AdminAuthModule {}
