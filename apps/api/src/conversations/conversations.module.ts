import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { ConversationsGateway } from './conversations.gateway';
import { AttachmentScanService } from './attachment-scan.service';
import { AttachmentScanWorker } from './attachment-scan.worker';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: 'attachment-scan' })],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    AttachmentStorageService,
    ConversationsGateway,
    AttachmentScanService,
    AttachmentScanWorker,
  ],
})
export class ConversationsModule {}
