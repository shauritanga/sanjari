import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { ModerationController } from './moderation.controller';
import { ModerationRetentionService } from './moderation-retention.service';
import { ModerationRetentionWorker } from './moderation-retention.worker';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: 'moderation-retention' })],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationRetentionService, ModerationRetentionWorker],
  exports: [ModerationService, ModerationRetentionService],
})
export class ModerationModule {}
