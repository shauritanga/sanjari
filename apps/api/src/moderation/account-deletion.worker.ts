import { Processor, WorkerHost } from '@nestjs/bullmq';
import { AccountDeletionService } from './account-deletion.service';

@Processor('account-deletion')
export class AccountDeletionWorker extends WorkerHost {
  constructor(private readonly deletion: AccountDeletionService) {
    super();
  }

  async process() {
    return this.deletion.process();
  }
}
