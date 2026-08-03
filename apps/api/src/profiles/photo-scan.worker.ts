import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PhotoScanService } from './photo-scan.service';

@Processor('photo-scan')
export class PhotoScanWorker extends WorkerHost {
  constructor(private readonly scanner: PhotoScanService) {
    super();
  }
  async process(job: Job<{ photoId: string }>) {
    return this.scanner.process(job.data.photoId);
  }
}
