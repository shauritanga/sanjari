import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { DataExportService } from './data-export.service';
import {
  AppealDto,
  BlockDto,
  DataDeletionDto,
  ModerationActionDto,
  ModerationCaseUpdateDto,
  ReportDto,
} from './dto';

const highRiskCategories = new Set(['scam', 'impersonation', 'underage_concern', 'unsafe_meeting']);
const caseStatuses = new Set([
  'submitted',
  'triaged',
  'assigned',
  'investigating',
  'actioned',
  'dismissed',
  'escalated',
  'closed',
]);

function initialRisk(category: string, description?: string): { score: number; severity: string } {
  let score = highRiskCategories.has(category) ? 70 : 25;
  if (
    description &&
    /(payment|money|cash|off.?platform|minor|underage|threat)/i.test(description)
  ) {
    score += 20;
  }
  return { score: Math.min(score, 100), severity: score >= 70 ? 'high' : 'medium' };
}

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly dataExport?: DataExportService,
  ) {}

  private async requireModerator(adminUserId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        status: true,
        roles: {
          select: {
            role: {
              select: { permissions: { select: { permission: { select: { key: true } } } } },
            },
          },
        },
      },
    });
    const permissions = new Set(
      admin?.roles.flatMap((role) => role.role.permissions.map((item) => item.permission.key)) ??
        [],
    );
    if (!admin || admin.status !== 'active' || !permissions.has('reports.resolve')) {
      throw new BadRequestException({
        code: 'MODERATION_PERMISSION_REQUIRED',
        message: 'Moderation permission is required.',
      });
    }
    return admin.id;
  }

  async queue(adminUserId: string, status?: string) {
    await this.requireModerator(adminUserId);
    return this.prisma.moderationCase.findMany({
      where: status
        ? { status }
        : { status: { in: ['submitted', 'triaged', 'assigned', 'investigating', 'escalated'] } },
      include: {
        report: { include: { evidence: true } },
        appeals: true,
        actions: true,
      },
      orderBy: [{ report: { priority: 'desc' } }, { createdAt: 'asc' }],
    });
  }

  async updateCase(adminUserId: string, caseId: string, dto: ModerationCaseUpdateDto) {
    await this.requireModerator(adminUserId);
    if (!caseStatuses.has(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_CASE_STATUS',
        message: 'Invalid moderation case status.',
      });
    }
    const current = await this.prisma.moderationCase.findUnique({ where: { id: caseId } });
    if (!current)
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Moderation case not found.',
      });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationCase.update({
        where: { id: caseId },
        data: { status: dto.status, notes: dto.reason },
      });
      await tx.report.update({ where: { id: current.reportId }, data: { status: dto.status } });
      await tx.auditLog.create({
        data: {
          adminUserId,
          actorType: 'admin',
          action: 'moderation.case_updated',
          metadata: { caseId, from: current.status, to: dto.status, reason: dto.reason },
        },
      });
      return result;
    });
    return { id: updated.id, status: updated.status };
  }

  async action(adminUserId: string, caseId: string, dto: ModerationActionDto) {
    await this.requireModerator(adminUserId);
    const current = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: { report: { select: { reportedUserId: true, riskScore: true } } },
    });
    if (!current)
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Moderation case not found.',
      });
    if (dto.action === 'ban' && !['investigating', 'escalated'].includes(current.status)) {
      throw new BadRequestException({
        code: 'REVIEW_REQUIRED',
        message: 'A permanent ban requires human investigation or escalation.',
      });
    }
    const action = await this.prisma.$transaction(async (tx) => {
      const created = await tx.moderationAction.create({
        data: {
          caseId,
          actorId: adminUserId,
          action: dto.action,
          reason: dto.reason,
          metadata: { riskScore: current.report.riskScore },
        },
      });
      if (dto.action === 'suspend' || dto.action === 'ban') {
        await tx.user.update({
          where: { id: current.report.reportedUserId },
          data: { status: dto.action === 'ban' ? 'banned' : 'suspended' },
        });
      }
      await tx.report.update({
        where: { id: current.reportId },
        data: { actionTaken: dto.action, status: 'actioned' },
      });
      await tx.moderationCase.update({ where: { id: caseId }, data: { status: 'actioned' } });
      await tx.auditLog.create({
        data: {
          adminUserId,
          actorType: 'admin',
          action: 'moderation.action_created',
          metadata: {
            caseId,
            action: dto.action,
            targetUserId: current.report.reportedUserId,
            reason: dto.reason,
          },
        },
      });
      return created;
    });
    return { id: action.id, caseId, action: action.action, status: 'actioned' };
  }

  async block(blockerId: string, blockedId: string, dto: BlockDto) {
    if (blockerId === blockedId) {
      throw new BadRequestException({
        code: 'SELF_BLOCK_NOT_ALLOWED',
        message: 'You cannot block yourself.',
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });

    const reason = dto.reason ?? null;
    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId, reason },
        update: { reason },
      });
      await tx.auditLog.create({
        data: {
          userId: blockerId,
          actorType: 'user',
          action: 'safety.block_created',
          metadata: { blockedId },
        },
      });
    });
    return { blockedUserId: blockedId, blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    const result = await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    if (result.count > 0) {
      await this.prisma.auditLog.create({
        data: {
          userId: blockerId,
          actorType: 'user',
          action: 'safety.block_removed',
          metadata: { blockedId },
        },
      });
    }
    return { blockedUserId: blockedId, blocked: false };
  }

  async listBlocks(userId: string) {
    return this.prisma.block.findMany({
      where: { blockerId: userId },
      select: { id: true, blockedId: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async report(reporterId: string, dto: ReportDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException({
        code: 'SELF_REPORT_NOT_ALLOWED',
        message: 'You cannot report yourself.',
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: dto.reportedUserId },
      select: { id: true },
    });
    if (!target)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    const risk = initialRisk(dto.category, dto.description);

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: {
          reporterId,
          reportedUserId: dto.reportedUserId,
          category: dto.category,
          description: dto.description ?? null,
          riskScore: risk.score,
          priority: risk.severity === 'high' ? 'high' : 'normal',
        },
      });
      if (dto.evidence?.length) {
        await tx.reportEvidence.createMany({
          data: dto.evidence.map((item) => ({
            reportId: created.id,
            type: item.type,
            snapshot: { referenceId: item.referenceId },
          })),
        });
      }
      const moderationCase = await tx.moderationCase.create({
        data: { reportId: created.id, status: 'triaged' },
      });
      if (risk.severity === 'high') {
        await tx.riskSignal.create({
          data: {
            userId: dto.reportedUserId,
            type: `report:${dto.category}`,
            severity: risk.severity,
            metadata: { reportId: created.id, score: risk.score },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: reporterId,
          actorType: 'user',
          action: 'safety.report_submitted',
          metadata: {
            reportId: created.id,
            category: dto.category,
            evidenceCount: dto.evidence?.length ?? 0,
          },
        },
      });
      return {
        id: created.id,
        caseId: moderationCase.id,
        status: created.status,
        priority: created.priority,
      };
    });
    return report;
  }

  async appeal(userId: string, caseId: string, dto: AppealDto) {
    const moderationCase = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: { report: { select: { reportedUserId: true } } },
    });
    if (!moderationCase)
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        message: 'Moderation case not found.',
      });
    if (moderationCase.report.reportedUserId !== userId) {
      throw new BadRequestException({
        code: 'APPEAL_NOT_ALLOWED',
        message: 'Only the reported user can appeal this case.',
      });
    }
    const appeal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appeal.create({
        data: { caseId, userId, statement: dto.statement },
      });
      await tx.report.update({
        where: { id: moderationCase.reportId },
        data: { appealStatus: 'submitted' },
      });
      await tx.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'safety.appeal_submitted',
          metadata: { caseId, appealId: created.id },
        },
      });
      return created;
    });
    return { id: appeal.id, caseId: appeal.caseId, status: appeal.status };
  }

  async appealableCases(userId: string) {
    return this.prisma.moderationCase.findMany({
      where: {
        report: { reportedUserId: userId },
        status: { in: ['actioned', 'suspended', 'banned', 'appealed'] },
      },
      select: {
        id: true,
        status: true,
        report: { select: { category: true, appealStatus: true } },
        appeals: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  guidance(locale = 'en') {
    const swahili = locale.toLowerCase().startsWith('sw');
    return {
      title: swahili ? 'Kituo cha Usalama cha Sanjari' : 'Sanjari Safety Centre',
      sections: swahili
        ? [
            {
              key: 'scams',
              title: 'Jihadhari na utapeli',
              body: 'Usitume pesa, misimbo, au taarifa za kifedha kwa mtu uliyekutana naye hapa.',
            },
            {
              key: 'privacy',
              title: 'Linda faragha yako',
              body: 'Toa taarifa binafsi taratibu na ficha anwani ya nyumbani, kazi, na akaunti zako.',
            },
            {
              key: 'meetings',
              title: 'Kutana kwa usalama',
              body: 'Chagua eneo la wazi, mjulishe mtu unayemwamini, na panga usafiri wako mwenyewe.',
            },
            {
              key: 'guidelines',
              title: 'Miongozo ya jamii',
              body: 'Heshimu mipaka, usitishie wengine, na usitumie Sanjari kwa ulaghai au unyanyasaji.',
            },
            {
              key: 'verification',
              title: 'Maana ya uthibitishaji',
              body: 'Uthibitishaji unaonyesha ukaguzi uliofanywa. Hauhakikishi utambulisho, nia, au usalama wa mtu.',
            },
            {
              key: 'emergency',
              title: 'Hatari ya haraka',
              body: 'Wasiliana na huduma za dharura na mtu unayemwamini. Tumia ripoti ya Sanjari kwa hatua za jukwaa.',
            },
            {
              key: 'data',
              title: 'Dhibiti data yako',
              body: 'Unaweza kuomba nakala ya data yako au kuomba kufuta akaunti yako katika sehemu hii.',
            },
          ]
        : [
            {
              key: 'scams',
              title: 'Watch for scams',
              body: 'Never send money, codes, or financial details to someone you met here.',
            },
            {
              key: 'privacy',
              title: 'Protect your privacy',
              body: 'Share personal details gradually and keep your home, work, and account information private.',
            },
            {
              key: 'meetings',
              title: 'Meet safely',
              body: 'Choose a public place, tell someone you trust, and arrange your own transport.',
            },
            {
              key: 'guidelines',
              title: 'Community guidelines',
              body: 'Respect boundaries, do not threaten others, and never use Sanjari for fraud or harassment.',
            },
            {
              key: 'verification',
              title: 'What verification means',
              body: 'Verification supports account authenticity checks. It does not guarantee identity, intent, or safety.',
            },
            {
              key: 'emergency',
              title: 'Immediate danger',
              body: 'Contact local emergency services and someone you trust. Use Sanjari reporting for platform action.',
            },
            {
              key: 'data',
              title: 'Control your data',
              body: 'You can request a copy of your data or request account deletion from this centre.',
            },
          ],
    };
  }

  async dataControls(userId: string) {
    const [exports, deletions] = await Promise.all([
      this.prisma.dataExportRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.accountDeletionRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    return { exports, deletions };
  }

  async requestDataExport(userId: string) {
    const existing = await this.prisma.dataExportRequest.findFirst({
      where: { userId, status: { in: ['requested', 'processing'] } },
    });
    if (existing) return { id: existing.id, status: existing.status };
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dataExportRequest.create({ data: { userId, status: 'requested' } });
      await tx.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'privacy.export_requested',
          metadata: { requestId: created.id },
        },
      });
      return created;
    });
    await this.dataExport?.enqueue(request.id);
    return { id: request.id, status: request.status };
  }

  async requestAccountDeletion(userId: string, dto: DataDeletionDto) {
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: ['requested', 'scheduled'] } },
    });
    if (existing)
      return { id: existing.id, status: existing.status, executeAfter: existing.executeAfter };
    const executeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accountDeletionRequest.create({
        data: { userId, status: 'scheduled', reason: dto.reason ?? null, executeAfter },
      });
      await tx.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'privacy.deletion_requested',
          metadata: { requestId: created.id, executeAfter },
        },
      });
      return created;
    });
    return { id: request.id, status: request.status, executeAfter: request.executeAfter };
  }
}
