import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { AccountDeletionService } from './account-deletion.service';
import { AccountDeletionWorker } from './account-deletion.worker';
import { ModerationController } from './moderation.controller';
import { ModerationRetentionService } from './moderation-retention.service';
import { ModerationRetentionWorker } from './moderation-retention.worker';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: 'moderation-retention' }),
    BullModule.registerQueue({ name: 'account-deletion' }),
  ],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    ModerationRetentionService,
    ModerationRetentionWorker,
    AccountDeletionService,
    AccountDeletionWorker,
  ],
  exports: [ModerationService, ModerationRetentionService, AccountDeletionService],
})
export class ModerationModule {}
