import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class ModerationRetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('moderation-retention') private readonly queue?: Queue,
  ) {}

  async enqueue() {
    await this.queue?.add(
      'purge-evidence',
      {},
      { jobId: 'moderation-retention:purge', removeOnComplete: 20, removeOnFail: 20 },
    );
    return { jobKey: 'moderation-retention:purge', status: 'queued' };
  }

  async process() {
    const days = this.config.get<number>('MODERATION_EVIDENCE_RETENTION_DAYS', 90);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.reportEvidence.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        report: { moderationCase: { status: { in: ['closed', 'dismissed'] } } },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorType: 'system',
        action: 'safety.evidence_retention_purge',
        metadata: { deletedCount: result.count, retentionDays: days },
      },
    });
    return { deletedCount: result.count, retentionDays: days };
  }
}
