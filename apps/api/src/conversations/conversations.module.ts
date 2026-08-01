import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { ConversationsGateway } from './conversations.gateway';

@Module({
  imports: [AuthModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, AttachmentStorageService, ConversationsGateway],
})
export class ConversationsModule {}
