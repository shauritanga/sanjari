import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminClaims } from '../admin-auth/admin-auth.types';
import { PrismaService } from '../common/database/prisma.service';
import {
  AuditQueryDto,
  RoleAssignmentDto,
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
  constructor(private readonly prisma: PrismaService) {}

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
}
