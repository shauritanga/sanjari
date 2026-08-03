import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class PhotoScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('photo-scan') private readonly queue?: Queue,
  ) {}

  async enqueue(photoId: string) {
    await this.queue?.add(
      'scan',
      { photoId },
      { jobId: photoId, removeOnComplete: 100, removeOnFail: 100 },
    );
  }

  async process(photoId: string) {
    const photo = await this.prisma.profilePhoto.findUnique({
      where: { id: photoId },
      select: { id: true, storageKey: true, mimeType: true, sizeBytes: true },
    });
    if (!photo) return { status: 'missing' };
    // Fails closed: without a real content-scanning provider configured, a photo is
    // routed to human review rather than assumed safe. Setting PHOTO_SCAN_PROVIDER=local
    // is an explicit opt-in for environments without one (e.g. local development).
    const status =
      this.config.get<string>('PHOTO_SCAN_PROVIDER') === 'local' ? 'approved' : 'under_review';
    await this.prisma.profilePhoto.update({
      where: { id: photo.id },
      data: { moderationStatus: status },
    });
    return { status };
  }
}
