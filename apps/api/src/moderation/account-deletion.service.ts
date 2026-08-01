import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('account-deletion') private readonly queue?: Queue,
  ) {}

  async enqueue() {
    await this.queue?.add(
      'execute-due-deletions',
      {},
      { jobId: 'account-deletion:due', removeOnComplete: 20, removeOnFail: 20 },
    );
    return { jobKey: 'account-deletion:due', status: 'queued' };
  }

  async process() {
    const due = await this.prisma.accountDeletionRequest.findMany({
      where: { status: 'scheduled', executeAfter: { lte: new Date() } },
      select: { id: true, userId: true },
      take: 100,
    });
    let completed = 0;
    for (const request of due) {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: request.userId },
          select: { id: true },
        });
        if (!user) {
          await tx.accountDeletionRequest.update({
            where: { id: request.id },
            data: { status: 'completed' },
          });
          return;
        }
        await tx.user.update({
          where: { id: user.id },
          data: {
            email: `deleted+${user.id}@redacted.sanjari`,
            phoneNumber: null,
            status: 'deleted',
            deletedAt: new Date(),
          },
        });
        await tx.userCredential.deleteMany({ where: { userId: user.id } });
        await tx.userSession.deleteMany({ where: { userId: user.id } });
        await tx.userDevice.deleteMany({ where: { userId: user.id } });
        await tx.profile.deleteMany({ where: { userId: user.id } });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            actorType: 'system',
            action: 'privacy.account_deleted',
            metadata: { requestId: request.id },
          },
        });
        await tx.accountDeletionRequest.update({
          where: { id: request.id },
          data: { status: 'completed' },
        });
      });
      completed += 1;
    }
    return { completed };
  }
}
