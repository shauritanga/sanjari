import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { ConversationsGateway } from './conversations.gateway';
import { AttachmentScanService } from './attachment-scan.service';
import { AttachmentScanWorker } from './attachment-scan.worker';
import { ProfilesModule } from '../profiles/profiles.module';

const workerProviders = process.env.RUN_WORKERS === 'true' ? [AttachmentScanWorker] : [];

@Module({
  imports: [AuthModule, ProfilesModule, BullModule.registerQueue({ name: 'attachment-scan' })],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    AttachmentStorageService,
    ConversationsGateway,
    AttachmentScanService,
    ...workerProviders,
  ],
})
export class ConversationsModule {}
