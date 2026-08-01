import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { BullModule } from '@nestjs/bullmq';
import { AccountDeletionService } from './account-deletion.service';
import { AdminModerationController } from './admin-moderation.controller';
import { AccountDeletionWorker } from './account-deletion.worker';
import { DataExportService } from './data-export.service';
import { DataExportWorker } from './data-export.worker';
import { ModerationController } from './moderation.controller';
import { ModerationRetentionService } from './moderation-retention.service';
import { ModerationRetentionWorker } from './moderation-retention.worker';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    BullModule.registerQueue({ name: 'moderation-retention' }),
    BullModule.registerQueue({ name: 'account-deletion' }),
    BullModule.registerQueue({ name: 'data-export' }),
  ],
  controllers: [ModerationController, AdminModerationController],
  providers: [
    ModerationService,
    ModerationRetentionService,
    ModerationRetentionWorker,
    AccountDeletionService,
    AccountDeletionWorker,
    DataExportService,
    DataExportWorker,
  ],
  exports: [
    ModerationService,
    ModerationRetentionService,
    AccountDeletionService,
    DataExportService,
  ],
})
export class ModerationModule {}
