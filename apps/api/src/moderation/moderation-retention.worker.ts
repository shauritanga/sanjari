import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ModerationRetentionService } from './moderation-retention.service';

@Processor('moderation-retention')
export class ModerationRetentionWorker extends WorkerHost {
  constructor(private readonly retention: ModerationRetentionService) {
    super();
  }

  async process() {
    return this.retention.process();
  }
}
