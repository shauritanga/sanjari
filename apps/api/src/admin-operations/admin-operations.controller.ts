import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  AppVersionUpdateDto,
  AuditQueryDto,
  ContentPromptCreateDto,
  ContentPromptUpdateDto,
  DeletionRequestActionDto,
  FeatureFlagUpdateDto,
  LegalDocumentCreateDto,
  MatchingConfigUpdateDto,
  NotificationUpdateDto,
  RoleAssignmentDto,
  SupportTicketUpdateDto,
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

  @Get('verification-codes')
  @SetMetadata('adminPermission', 'verification.review')
  async verificationCodes(@Req() request: AdminRequest) {
    return { data: await this.operations.verificationCodes(request.admin!) };
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

  @Patch('notifications/:notificationId')
  @SetMetadata('adminPermission', 'notifications.manage')
  @UseGuards(AdminCsrfGuard)
  async updateNotification(
    @Req() request: AdminRequest,
    @Param('notificationId') notificationId: string,
    @Body() dto: NotificationUpdateDto,
  ) {
    return { data: await this.operations.updateNotification(request.admin!, notificationId, dto) };
  }

  @Patch('support/:ticketId')
  @SetMetadata('adminPermission', 'support.manage')
  @UseGuards(AdminCsrfGuard)
  async updateSupport(
    @Req() request: AdminRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: SupportTicketUpdateDto,
  ) {
    return { data: await this.operations.updateSupportTicket(request.admin!, ticketId, dto) };
  }

  @Get('analytics')
  @SetMetadata('adminPermission', 'analytics.read')
  async analytics(@Req() request: AdminRequest) {
    return { data: await this.operations.analytics(request.admin!) };
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

  @Get('content/prompts')
  @SetMetadata('adminPermission', 'configuration.manage')
  async contentPrompts(@Req() request: AdminRequest) {
    return { data: await this.operations.contentPrompts(request.admin!) };
  }

  @Post('content/prompts')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async createContentPrompt(@Req() request: AdminRequest, @Body() dto: ContentPromptCreateDto) {
    return { data: await this.operations.createContentPrompt(request.admin!, dto) };
  }

  @Patch('content/prompts/:promptId')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async updateContentPrompt(
    @Req() request: AdminRequest,
    @Param('promptId') promptId: string,
    @Body() dto: ContentPromptUpdateDto,
  ) {
    return { data: await this.operations.updateContentPrompt(request.admin!, promptId, dto) };
  }

  @Get('matching-config')
  @SetMetadata('adminPermission', 'configuration.manage')
  async matchingConfig(@Req() request: AdminRequest) {
    return { data: await this.operations.matchingConfig(request.admin!) };
  }

  @Patch('matching-config')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async updateMatchingConfig(@Req() request: AdminRequest, @Body() dto: MatchingConfigUpdateDto) {
    return { data: await this.operations.updateMatchingConfig(request.admin!, dto) };
  }

  @Get('legal-documents')
  @SetMetadata('adminPermission', 'legal.read')
  async legalDocuments(@Req() request: AdminRequest) {
    return { data: await this.operations.legalDocuments(request.admin!) };
  }

  @Post('legal-documents')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async createLegalDocument(@Req() request: AdminRequest, @Body() dto: LegalDocumentCreateDto) {
    return { data: await this.operations.createLegalDocument(request.admin!, dto) };
  }

  @Get('deletion-requests')
  @SetMetadata('adminPermission', 'users.read')
  async deletionRequests(@Req() request: AdminRequest) {
    return { data: await this.operations.deletionRequests(request.admin!) };
  }

  @Patch('deletion-requests/:requestId')
  @SetMetadata('adminPermission', 'users.suspend')
  @UseGuards(AdminCsrfGuard)
  async updateDeletionRequest(
    @Req() request: AdminRequest,
    @Param('requestId') requestId: string,
    @Body() dto: DeletionRequestActionDto,
  ) {
    return { data: await this.operations.updateDeletionRequest(request.admin!, requestId, dto) };
  }

  @Get('app-versions')
  @SetMetadata('adminPermission', 'versions.read')
  async appVersions(@Req() request: AdminRequest) {
    return { data: await this.operations.appVersions(request.admin!) };
  }

  @Patch('app-versions')
  @SetMetadata('adminPermission', 'configuration.manage')
  @UseGuards(AdminCsrfGuard)
  async updateAppVersion(@Req() request: AdminRequest, @Body() dto: AppVersionUpdateDto) {
    return { data: await this.operations.updateAppVersion(request.admin!, dto) };
  }
}
