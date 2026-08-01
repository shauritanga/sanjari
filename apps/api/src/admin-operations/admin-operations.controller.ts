import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminCsrfGuard } from '../admin-auth/admin-csrf.guard';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard';
import type { AdminRequest } from '../admin-auth/admin-auth.types';
import { AdminOperationsService } from './admin-operations.service';
import {
  AuditQueryDto,
  FeatureFlagUpdateDto,
  RoleAssignmentDto,
  UserSearchQueryDto,
  UserSuspensionDto,
  VerificationReviewDto,
} from './dto';

@Controller({ path: 'admin/operations', version: '1' })
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('users')
  @SetMetadata('adminPermission', 'users.read')
  async users(@Req() request: AdminRequest, @Query() query: UserSearchQueryDto) {
    return { data: await this.operations.searchUsers(request.admin!, query) };
  }

  @Get('dashboard')
  @SetMetadata('adminPermission', 'analytics.read')
  async dashboard(@Req() request: AdminRequest) {
    return { data: await this.operations.dashboard(request.admin!) };
  }

  @Get('roles')
  @SetMetadata('adminPermission', 'configuration.manage')
  async roles(@Req() request: AdminRequest) {
    return { data: await this.operations.roles(request.admin!) };
  }

  @Patch('admins/:adminUserId/roles')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async assignRole(
    @Req() request: AdminRequest,
    @Param('adminUserId') adminUserId: string,
    @Body() dto: RoleAssignmentDto,
  ) {
    return { data: await this.operations.assignRole(request.admin!, adminUserId, dto) };
  }

  @Get('verification')
  @SetMetadata('adminPermission', 'verification.review')
  async verification(@Req() request: AdminRequest) {
    return { data: await this.operations.verificationQueue(request.admin!) };
  }

  @Patch('verification/:caseId')
  @SetMetadata('adminPermission', 'verification.review')
  @UseGuards(AdminCsrfGuard)
  async reviewVerification(
    @Req() request: AdminRequest,
    @Param('caseId') caseId: string,
    @Body() dto: VerificationReviewDto,
  ) {
    return { data: await this.operations.reviewVerification(request.admin!, caseId, dto) };
  }

  @Get('subscriptions')
  @SetMetadata('adminPermission', 'subscriptions.read')
  async subscriptions(@Req() request: AdminRequest) {
    return { data: await this.operations.subscriptions(request.admin!) };
  }

  @Get('payments')
  @SetMetadata('adminPermission', 'payments.read')
  async payments(@Req() request: AdminRequest) {
    return { data: await this.operations.payments(request.admin!) };
  }

  @Get('flags')
  @SetMetadata('adminPermission', 'configuration.manage')
  async featureFlags(@Req() request: AdminRequest) {
    return { data: await this.operations.featureFlags(request.admin!) };
  }

  @Patch('flags/:flagId')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async updateFeatureFlag(
    @Req() request: AdminRequest,
    @Param('flagId') flagId: string,
    @Body() dto: FeatureFlagUpdateDto,
  ) {
    return { data: await this.operations.updateFeatureFlag(request.admin!, flagId, dto) };
  }

  @Get('notifications')
  @SetMetadata('adminPermission', 'notifications.manage')
  async notifications(@Req() request: AdminRequest) {
    return { data: await this.operations.notifications(request.admin!) };
  }

  @Get('support')
  @SetMetadata('adminPermission', 'support.read')
  async support(@Req() request: AdminRequest) {
    return { data: await this.operations.supportTickets(request.admin!) };
  }

  @Get('health')
  @SetMetadata('adminPermission', 'health.read')
  async health(@Req() request: AdminRequest) {
    return { data: await this.operations.health(request.admin!) };
  }

  @Patch('users/:userId/suspend')
  @SetMetadata('adminPermission', 'users.suspend')
  @UseGuards(AdminCsrfGuard)
  async suspend(
    @Req() request: AdminRequest,
    @Param('userId') userId: string,
    @Body() dto: UserSuspensionDto,
  ) {
    return { data: await this.operations.suspendUser(request.admin!, userId, dto) };
  }

  @Get('audit')
  @SetMetadata('adminPermission', 'audit.read')
  async audit(@Req() request: AdminRequest, @Query() query: AuditQueryDto) {
    return { data: await this.operations.audit(request.admin!, query) };
  }
}
