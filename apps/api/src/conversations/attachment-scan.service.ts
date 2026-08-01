import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';

export interface AttachmentScanProvider {
  scan(storageKey: string, mimeType: string, sizeBytes: number): Promise<'approved' | 'rejected'>;
}

@Injectable()
export class AttachmentScanService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('attachment-scan') private readonly queue?: Queue,
  ) {}

  async enqueue(attachmentId: string) {
    await this.queue?.add(
      'scan',
      { attachmentId },
      { jobId: attachmentId, removeOnComplete: 100, removeOnFail: 100 },
    );
  }

  async process(attachmentId: string) {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, storageKey: true, mimeType: true, sizeBytes: true },
    });
    if (!attachment) return { status: 'missing' };
    const status = 'pending_review';
    await this.prisma.messageAttachment.update({ where: { id: attachment.id }, data: { status } });
    return { status };
  }
}
