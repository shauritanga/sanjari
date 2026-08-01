import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../common/database/prisma.service';

interface DataExportStorage {
  put(key: string, payload: string): Promise<void>;
  downloadUrl(key: string): string;
}

class LocalDataExportStorage implements DataExportStorage {
  constructor(private readonly directory: string) {}

  async put(key: string, payload: string) {
    const filePath = join(this.directory, key);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, payload, 'utf8');
  }

  downloadUrl(key: string) {
    return `file://${join(this.directory, key)}`;
  }
}

@Injectable()
export class DataExportService {
  private readonly storage: DataExportStorage;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('data-export') private readonly queue?: Queue,
  ) {
    this.storage = new LocalDataExportStorage('/tmp/sanjari-exports');
  }

  async enqueue(requestId?: string) {
    await this.queue?.add(
      'generate',
      { requestId },
      {
        jobId: requestId ? `data-export:${requestId}` : 'data-export:pending',
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    return { status: 'queued' };
  }

  async process(requestId?: string) {
    if (this.config.get<string>('DATA_EXPORT_PROVIDER') !== 'local')
      return { status: 'pending_provider' };
    const requests = await this.prisma.dataExportRequest.findMany({
      where: { status: 'requested', ...(requestId ? { id: requestId } : {}) },
      select: { id: true, userId: true },
      take: 20,
    });
    let completed = 0;
    for (const request of requests) {
      await this.prisma.dataExportRequest.update({
        where: { id: request.id },
        data: { status: 'processing' },
      });
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: request.userId },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            locale: true,
            dateOfBirth: true,
            createdAt: true,
            profile: {
              select: { displayName: true, city: true, biography: true, verificationStatus: true },
            },
            reportsSubmitted: {
              select: { id: true, category: true, status: true, createdAt: true },
            },
            blocksSent: { select: { blockedId: true, reason: true, createdAt: true } },
          },
        });
        if (!user) throw new Error('User not found');
        const key = `exports/${user.id}/${request.id}.json`;
        await this.storage.put(
          key,
          JSON.stringify({ exportedAt: new Date().toISOString(), user }, null, 2),
        );
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.$transaction(async (tx) => {
          await tx.dataExportRequest.update({
            where: { id: request.id },
            data: { status: 'completed', storageKey: key, expiresAt },
          });
          await tx.auditLog.create({
            data: {
              userId: user.id,
              actorType: 'system',
              action: 'privacy.export_completed',
              metadata: { requestId: request.id, expiresAt },
            },
          });
        });
        completed += 1;
      } catch (error) {
        await this.prisma.dataExportRequest.update({
          where: { id: request.id },
          data: { status: 'failed' },
        });
        await this.prisma.auditLog.create({
          data: {
            userId: request.userId,
            actorType: 'system',
            action: 'privacy.export_failed',
            metadata: {
              requestId: request.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        });
      }
    }
    return { status: 'completed', completed };
  }

  async downloadInfo(userId: string, requestId: string) {
    const request = await this.prisma.dataExportRequest.findFirst({
      where: { id: requestId, userId, status: 'completed' },
    });
    if (!request?.storageKey || !request.expiresAt || request.expiresAt <= new Date()) return null;
    return {
      id: request.id,
      status: request.status,
      expiresAt: request.expiresAt,
      downloadUrl: this.storage.downloadUrl(request.storageKey),
    };
  }
}
