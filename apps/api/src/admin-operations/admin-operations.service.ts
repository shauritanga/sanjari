import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { AdminClaims } from '../admin-auth/admin-auth.types';
import { PrismaService } from '../common/database/prisma.service';
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

function requirePermission(admin: AdminClaims, permission: string) {
  if (!admin.permissions.includes(permission)) {
    throw new ForbiddenException({
      code: 'ADMIN_PERMISSION_REQUIRED',
      message: 'Admin permission is required.',
    });
  }
}

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async verificationCodes(admin: AdminClaims) {
    requirePermission(admin, 'verification.review');
    const enabled = this.config?.get<boolean>('AUTH_TEST_CODE_VISIBILITY', false) ?? false;
    if (!enabled) return { enabled: false, email: [], phone: [] };
    const now = new Date();
    const [email, phone] = await Promise.all([
      this.prisma.emailVerification.findMany({
        where: { verifiedAt: null, expiresAt: { gt: now }, testCode: { not: null } },
        select: { id: true, userId: true, email: true, testCode: true, expiresAt: true, createdAt: true, attempts: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.phoneVerification.findMany({
        where: { verifiedAt: null, expiresAt: { gt: now }, testCode: { not: null } },
        select: { id: true, userId: true, phoneNumber: true, testCode: true, expiresAt: true, createdAt: true, attempts: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.verification_codes_read',
        metadata: { emailCount: email.length, phoneCount: phone.length },
      },
    });
    return { enabled: true, email, phone };
  }

  async searchUsers(admin: AdminClaims, query: UserSearchQueryDto) {
    requirePermission(admin, 'users.read');
    const term = query.query?.trim();
    const idTerm = term && /^[0-9a-f-]{36}$/i.test(term) ? term : undefined;
    const users = await this.prisma.user.findMany({
      where: term
        ? {
            OR: [
              ...(idTerm ? [{ id: idTerm }] : []),
              { email: { contains: term, mode: 'insensitive' } },
              { profile: { displayName: { contains: term, mode: 'insensitive' } } },
            ],
          }
        : {},
      select: {
        id: true,
        email: true,
        status: true,
        locale: true,
        createdAt: true,
        deletedAt: true,
        profile: {
          select: {
            displayName: true,
            city: true,
            moderationStatus: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.users_read',
        metadata: { queryProvided: Boolean(term), resultCount: users.length },
      },
    });
    return users;
  }

  async suspendUser(admin: AdminClaims, userId: string, dto: UserSuspensionDto) {
    requirePermission(admin, 'users.suspend');
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!current)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    if (current.status === 'deleted')
      throw new ForbiddenException({
        code: 'USER_DELETED',
        message: 'Deleted users cannot be suspended.',
      });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: { status: 'suspended' },
        select: { id: true, status: true },
      });
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          userId,
          actorType: 'admin',
          action: 'admin.user_suspended',
          metadata: {
            before: { status: current.status },
            after: { status: result.status },
            reason: dto.reason,
          },
        },
      });
      return result;
    });
    return updated;
  }

  async audit(admin: AdminClaims, query: AuditQueryDto) {
    requirePermission(admin, 'audit.read');
    const result = await this.prisma.auditLog.findMany({
      where: query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {},
      select: {
        id: true,
        actorType: true,
        action: true,
        metadata: true,
        createdAt: true,
        userId: true,
        adminUserId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.audit_read',
        metadata: { actionFilter: query.action ?? null, resultCount: result.length },
      },
    });
    return result;
  }

  async dashboard(admin: AdminClaims) {
    requirePermission(admin, 'analytics.read');
    const [
      users,
      activeUsers,
      profiles,
      verifiedProfiles,
      likes,
      matches,
      conversations,
      messages,
      reports,
      suspensions,
      failedJobs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { verificationStatus: 'verified' } }),
      this.prisma.like.count(),
      this.prisma.match.count({ where: { status: 'active' } }),
      this.prisma.conversation.count({ where: { status: 'active' } }),
      this.prisma.message.count(),
      this.prisma.report.count({ where: { status: { notIn: ['closed', 'dismissed'] } } }),
      this.prisma.user.count({ where: { status: 'suspended' } }),
      this.prisma.backgroundJobRecord.count({ where: { status: 'failed' } }),
    ]);
    const result = {
      users,
      activeUsers,
      profiles,
      verifiedProfiles,
      likes,
      matches,
      conversations,
      messages,
      reports,
      suspensions,
      failedJobs,
    };
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.dashboard_read',
        metadata: { metricKeys: Object.keys(result) },
      },
    });
    return result;
  }

  async roles(admin: AdminClaims) {
    requirePermission(admin, 'configuration.manage');
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: { select: { permission: { select: { key: true, description: true } } } },
        admins: {
          select: {
            adminUser: { select: { id: true, email: true, displayName: true, status: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(admin: AdminClaims, adminUserId: string, dto: RoleAssignmentDto) {
    requirePermission(admin, 'configuration.manage');
    const [target, role] = await Promise.all([
      this.prisma.adminUser.findUnique({ where: { id: adminUserId }, select: { id: true } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId }, select: { id: true, name: true } }),
    ]);
    if (!target || !role)
      throw new NotFoundException({
        code: 'ROLE_ASSIGNMENT_TARGET_NOT_FOUND',
        message: 'Admin or role not found.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.adminRole.upsert({
        where: { adminUserId_roleId: { adminUserId, roleId: dto.roleId } },
        create: { adminUserId, roleId: dto.roleId },
        update: {},
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.role_assigned',
          metadata: { targetAdminUserId: adminUserId, roleId: dto.roleId, roleName: role.name },
        },
      });
      return { adminUserId, roleId: role.id, roleName: role.name };
    });
    return result;
  }

  async verificationQueue(admin: AdminClaims) {
    requirePermission(admin, 'verification.review');
    const result = await this.prisma.verificationCase.findMany({
      where: { status: { in: ['submitted', 'in_review'] } },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        provider: true,
        confidence: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.verification_queue_read',
        metadata: { resultCount: result.length },
      },
    });
    return result;
  }

  async reviewVerification(admin: AdminClaims, caseId: string, dto: VerificationReviewDto) {
    requirePermission(admin, 'verification.review');
    if (!['approved', 'rejected', 'needs_more_information'].includes(dto.status))
      throw new ForbiddenException({
        code: 'INVALID_VERIFICATION_STATUS',
        message: 'Invalid verification status.',
      });
    const current = await this.prisma.verificationCase.findUnique({
      where: { id: caseId },
      select: { id: true, userId: true, status: true },
    });
    if (!current)
      throw new NotFoundException({
        code: 'VERIFICATION_CASE_NOT_FOUND',
        message: 'Verification case not found.',
      });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.verificationCase.update({
        where: { id: caseId },
        data: { status: dto.status, reviewedBy: admin.id, reviewedAt: new Date() },
        select: { id: true, status: true, reviewedBy: true, reviewedAt: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.verification_reviewed',
          metadata: {
            caseId,
            userId: current.userId,
            before: { status: current.status },
            after: { status: result.status },
            reason: dto.reason,
          },
        },
      });
      return result;
    });
    return updated;
  }

  async subscriptions(admin: AdminClaims) {
    requirePermission(admin, 'subscriptions.read');
    const result = await this.prisma.subscription.findMany({
      select: {
        id: true,
        userId: true,
        status: true,
        provider: true,
        startsAt: true,
        endsAt: true,
        plan: { select: { code: true, title: true, priceCents: true, currency: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.subscriptions_read',
        metadata: { resultCount: result.length },
      },
    });
    return result;
  }

  async payments(admin: AdminClaims) {
    requirePermission(admin, 'payments.read');
    const result = await this.prisma.paymentEvent.findMany({
      select: {
        id: true,
        provider: true,
        externalEventId: true,
        eventType: true,
        signatureValid: true,
        processedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.payment_events_read',
        metadata: { resultCount: result.length, payloadRedacted: true },
      },
    });
    return result;
  }

  async featureFlags(admin: AdminClaims) {
    requirePermission(admin, 'configuration.manage');
    const result = await this.prisma.featureFlag.findMany({
      select: { id: true, key: true, enabled: true, rules: true, updatedAt: true },
      orderBy: { key: 'asc' },
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.feature_flags_read',
        metadata: { resultCount: result.length },
      },
    });
    return result;
  }

  async updateFeatureFlag(admin: AdminClaims, flagId: string, dto: FeatureFlagUpdateDto) {
    requirePermission(admin, 'configuration.manage');
    const current = await this.prisma.featureFlag.findUnique({
      where: { id: flagId },
      select: { id: true, key: true, enabled: true },
    });
    if (!current)
      throw new NotFoundException({
        code: 'FEATURE_FLAG_NOT_FOUND',
        message: 'Feature flag not found.',
      });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.featureFlag.update({
        where: { id: flagId },
        data: { enabled: dto.enabled },
        select: { id: true, key: true, enabled: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.feature_flag_updated',
          metadata: {
            flagId,
            key: current.key,
            before: { enabled: current.enabled },
            after: { enabled: result.enabled },
          },
        },
      });
      return result;
    });
    return updated;
  }

  async notifications(admin: AdminClaims) {
    requirePermission(admin, 'notifications.manage');
    const result = await this.prisma.notification.findMany({
      select: { id: true, userId: true, category: true, channel: true, title: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.notifications_read',
        metadata: { resultCount: result.length },
      },
    });
    return result;
  }

  async supportTickets(admin: AdminClaims) {
    requirePermission(admin, 'support.read');
    const result = await this.prisma.supportTicket.findMany({
      select: { id: true, userId: true, subject: true, status: true, priority: true, createdAt: true, updatedAt: true },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
      take: 100,
    });
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.support_tickets_read',
        metadata: { resultCount: result.length },
      },
    });
    return result;
  }

  async health(admin: AdminClaims) {
    requirePermission(admin, 'health.read');
    const [failedJobs, activeJobs, recentJobs] = await Promise.all([
      this.prisma.backgroundJobRecord.count({ where: { status: 'failed' } }),
      this.prisma.backgroundJobRecord.count({ where: { status: { in: ['queued', 'running'] } } }),
      this.prisma.backgroundJobRecord.findMany({
        select: { id: true, queue: true, jobKey: true, status: true, attempts: true, lastError: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.health_read',
        metadata: { failedJobs, activeJobs, recentJobCount: recentJobs.length },
      },
    });
    return { failedJobs, activeJobs, recentJobs };
  }

  async updateSupportTicket(admin: AdminClaims, ticketId: string, dto: SupportTicketUpdateDto) {
    requirePermission(admin, 'support.manage');
    const current = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, priority: true },
    });
    if (!current)
      throw new NotFoundException({ code: 'SUPPORT_TICKET_NOT_FOUND', message: 'Support ticket not found.' });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: dto.status, priority: dto.priority },
        select: { id: true, status: true, priority: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.support_ticket_updated',
          metadata: {
            ticketId,
            before: { status: current.status, priority: current.priority },
            after: { status: updated.status, priority: updated.priority },
            reason: dto.reason,
          },
        },
      });
      return updated;
    });
  }

  async updateNotification(admin: AdminClaims, notificationId: string, dto: NotificationUpdateDto) {
    requirePermission(admin, 'notifications.manage');
    const current = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, readAt: true },
    });
    if (!current)
      throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.notification.update({
        where: { id: notificationId },
        data: { readAt: dto.status === 'read' ? current.readAt ?? new Date() : null },
        select: { id: true, readAt: true },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.notification_updated',
          metadata: {
            notificationId,
            before: { read: Boolean(current.readAt) },
            after: { read: Boolean(updated.readAt) },
            reason: dto.reason,
          },
        },
      });
      return updated;
    });
  }

  async analytics(admin: AdminClaims) {
    requirePermission(admin, 'analytics.read');
    const [unreadNotifications, openSupportTickets, failedExports, failedJobs, recentAuditEvents] =
      await Promise.all([
        this.prisma.notification.count({ where: { readAt: null } }),
        this.prisma.supportTicket.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
        this.prisma.dataExportRequest.count({ where: { status: 'failed' } }),
        this.prisma.backgroundJobRecord.count({ where: { status: 'failed' } }),
        this.prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      ]);
    const result = { unreadNotifications, openSupportTickets, failedExports, failedJobs, recentAuditEvents };
    await this.prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'admin.analytics_read',
        metadata: { metricKeys: Object.keys(result) },
      },
    });
    return result;
  }

  async contentPrompts(admin: AdminClaims) {
    requirePermission(admin, 'configuration.manage');
    return this.prisma.profilePrompt.findMany({
      select: { id: true, locale: true, prompt: true, active: true, createdAt: true },
      orderBy: [{ locale: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createContentPrompt(admin: AdminClaims, dto: ContentPromptCreateDto) {
    requirePermission(admin, 'configuration.manage');
    return this.prisma.$transaction(async (tx) => {
      const prompt = await tx.profilePrompt.create({
        data: { locale: dto.locale, prompt: dto.prompt },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.content_prompt_created',
          metadata: { promptId: prompt.id, locale: prompt.locale },
        },
      });
      return prompt;
    });
  }

  async updateContentPrompt(admin: AdminClaims, promptId: string, dto: ContentPromptUpdateDto) {
    requirePermission(admin, 'configuration.manage');
    const current = await this.prisma.profilePrompt.findUnique({ where: { id: promptId } });
    if (!current)
      throw new NotFoundException({ code: 'PROMPT_NOT_FOUND', message: 'Prompt not found.' });
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.profilePrompt.update({
        where: { id: promptId },
        data: {
          ...(dto.prompt !== undefined && { prompt: dto.prompt }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.content_prompt_updated',
          metadata: {
            promptId,
            before: { prompt: current.prompt, active: current.active },
            after: { prompt: result.prompt, active: result.active },
          },
        },
      });
      return result;
    });
  }

  private defaultMatchingWeights() {
    return {
      sharedInterestWeight: 15,
      sharedInterestCap: 45,
      completenessWeight: 0.35,
      verificationBonus: 20,
    };
  }

  async matchingConfig(admin: AdminClaims) {
    requirePermission(admin, 'configuration.manage');
    const row = await this.prisma.applicationConfiguration.findUnique({
      where: { key: 'matching.weights' },
    });
    return row
      ? { ...(row.value as Record<string, number>), updatedAt: row.updatedAt }
      : { ...this.defaultMatchingWeights(), updatedAt: null };
  }

  async updateMatchingConfig(admin: AdminClaims, dto: MatchingConfigUpdateDto) {
    requirePermission(admin, 'configuration.manage');
    const before = await this.prisma.applicationConfiguration.findUnique({
      where: { key: 'matching.weights' },
    });
    const value = {
      sharedInterestWeight: dto.sharedInterestWeight,
      sharedInterestCap: dto.sharedInterestCap,
      completenessWeight: dto.completenessWeight,
      verificationBonus: dto.verificationBonus,
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.applicationConfiguration.upsert({
        where: { key: 'matching.weights' },
        create: { key: 'matching.weights', value },
        update: { value },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.matching_config_updated',
          metadata: { before: before?.value ?? this.defaultMatchingWeights(), after: value },
        },
      });
      return result;
    });
    return { ...(updated.value as Record<string, number>), updatedAt: updated.updatedAt };
  }

  async legalDocuments(admin: AdminClaims) {
    requirePermission(admin, 'legal.read');
    return this.prisma.legalDocument.findMany({
      orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }],
    });
  }

  async createLegalDocument(admin: AdminClaims, dto: LegalDocumentCreateDto) {
    requirePermission(admin, 'configuration.manage');
    const existing = await this.prisma.legalDocument.findUnique({
      where: { type_version_locale: { type: dto.type, version: dto.version, locale: dto.locale } },
    });
    if (existing)
      throw new ForbiddenException({
        code: 'LEGAL_DOCUMENT_VERSION_EXISTS',
        message: 'This document type, version, and locale has already been published.',
      });
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.legalDocument.create({
        data: {
          type: dto.type,
          version: dto.version,
          locale: dto.locale,
          contentHash: dto.contentHash,
          publishedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.legal_document_published',
          metadata: {
            documentId: document.id,
            type: document.type,
            version: document.version,
            locale: document.locale,
          },
        },
      });
      return document;
    });
  }

  async deletionRequests(admin: AdminClaims) {
    requirePermission(admin, 'users.read');
    const requests = await this.prisma.accountDeletionRequest.findMany({
      orderBy: { executeAfter: 'asc' },
      take: 100,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: requests.map((request) => request.userId) } },
      select: { id: true, email: true, profile: { select: { displayName: true } } },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));
    return requests.map((request) => ({
      ...request,
      user: userMap.get(request.userId) ?? null,
    }));
  }

  async updateDeletionRequest(
    admin: AdminClaims,
    requestId: string,
    dto: DeletionRequestActionDto,
  ) {
    requirePermission(admin, 'users.suspend');
    const current = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
    });
    if (!current)
      throw new NotFoundException({
        code: 'DELETION_REQUEST_NOT_FOUND',
        message: 'Deletion request not found.',
      });
    if (!['requested', 'scheduled'].includes(current.status))
      throw new ForbiddenException({
        code: 'DELETION_REQUEST_NOT_ACTIONABLE',
        message: 'This request has already been processed.',
      });
    const data = dto.action === 'cancel' ? { status: 'cancelled' } : { executeAfter: new Date() };
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.accountDeletionRequest.update({ where: { id: requestId }, data });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          userId: current.userId,
          actorType: 'admin',
          action: `admin.deletion_request_${dto.action}`,
          metadata: { requestId, reason: dto.reason ?? null },
        },
      });
      return result;
    });
  }

  private defaultAppVersions() {
    const platform = {
      minSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      rolloutPercentage: 100,
      releaseNotes: null as string | null,
      updatedAt: null as string | null,
    };
    return { ios: platform, android: { ...platform } };
  }

  async appVersions(admin: AdminClaims) {
    requirePermission(admin, 'versions.read');
    const row = await this.prisma.applicationConfiguration.findUnique({
      where: { key: 'app_versions' },
    });
    return row ? row.value : this.defaultAppVersions();
  }

  async updateAppVersion(admin: AdminClaims, dto: AppVersionUpdateDto) {
    requirePermission(admin, 'configuration.manage');
    const row = await this.prisma.applicationConfiguration.findUnique({
      where: { key: 'app_versions' },
    });
    const current = (row?.value as Record<string, unknown>) ?? this.defaultAppVersions();
    const before = current[dto.platform];
    const platformValue = {
      minSupportedVersion: dto.minSupportedVersion,
      latestVersion: dto.latestVersion,
      forceUpdate: dto.forceUpdate,
      rolloutPercentage: dto.rolloutPercentage,
      releaseNotes: dto.releaseNotes ?? null,
      updatedAt: new Date().toISOString(),
    };
    const value = { ...current, [dto.platform]: platformValue } as Prisma.InputJsonObject;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.applicationConfiguration.upsert({
        where: { key: 'app_versions' },
        create: { key: 'app_versions', value },
        update: { value },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          actorType: 'admin',
          action: 'admin.app_version_updated',
          metadata: {
            platform: dto.platform,
            before: before as Prisma.InputJsonValue,
            after: platformValue,
          },
        },
      });
      return result;
    });
    return updated.value;
  }
}
