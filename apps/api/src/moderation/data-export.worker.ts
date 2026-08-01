import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DataExportService } from './data-export.service';

@Processor('data-export')
export class DataExportWorker extends WorkerHost {
  constructor(private readonly exports: DataExportService) {
    super();
  }

  async process(job: Job<{ requestId?: string }>) {
    return this.exports.process(job.data.requestId);
  }
}
