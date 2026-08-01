import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class RankingEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ranking-evaluation') private readonly queue?: Queue,
  ) {}

  async enqueue(rankingVersion: string) {
    const jobKey = `ranking-evaluation:${rankingVersion}`;
    await this.queue?.add(
      'evaluate',
      { rankingVersion },
      { jobId: jobKey, removeOnComplete: 100, removeOnFail: 100 },
    );
    await this.prisma.backgroundJobRecord.upsert({
      where: { queue_jobKey: { queue: 'ranking-evaluation', jobKey } },
      create: { queue: 'ranking-evaluation', jobKey, status: 'queued' },
      update: { status: 'queued', lastError: null },
    });
    return { jobKey, status: 'queued' };
  }

  async run(rankingVersion: string) {
    const jobKey = `ranking-evaluation:${rankingVersion}`;
    await this.prisma.backgroundJobRecord.update({
      where: { queue_jobKey: { queue: 'ranking-evaluation', jobKey } },
      data: { status: 'running', attempts: { increment: 1 } },
    });
    try {
      const [shown, acted, matched] = await Promise.all([
        this.prisma.recommendation.count({ where: { rankingVersion, shownAt: { not: null } } }),
        this.prisma.recommendation.count({ where: { rankingVersion, userAction: { not: null } } }),
        this.prisma.recommendation.count({ where: { rankingVersion, matchOutcome: 'matched' } }),
      ]);
      const result = {
        rankingVersion,
        shown,
        acted,
        matched,
        actionRate: shown === 0 ? 0 : acted / shown,
        matchRate: shown === 0 ? 0 : matched / shown,
      };
      await this.prisma.backgroundJobRecord.update({
        where: { queue_jobKey: { queue: 'ranking-evaluation', jobKey } },
        data: { status: 'completed', lastError: null },
      });
      return result;
    } catch (error) {
      await this.prisma.backgroundJobRecord.update({
        where: { queue_jobKey: { queue: 'ranking-evaluation', jobKey } },
        data: {
          status: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown evaluation error',
        },
      });
      throw error;
    }
  }
}
