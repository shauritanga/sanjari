import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AttachmentScanService } from './attachment-scan.service';

@Processor('attachment-scan')
export class AttachmentScanWorker extends WorkerHost {
  constructor(private readonly scanner: AttachmentScanService) {
    super();
  }
  async process(job: Job<{ attachmentId: string }>) {
    return this.scanner.process(job.data.attachmentId);
  }
}
