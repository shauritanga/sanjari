import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';
import {
  AttachmentCompleteDto,
  AttachmentPresignDto,
  MessageHistoryQueryDto,
  ReactionDto,
  ReadReceiptDto,
  SendMessageDto,
} from './dto';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly gateway: ConversationsGateway,
  ) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await this.conversations.list(request.user!.sub) };
  }

  @Get(':conversationId/messages')
  async history(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: MessageHistoryQueryDto,
  ) {
    return this.conversations.history(request.user!.sub, conversationId, query.cursor);
  }

  @Post(':conversationId/messages')
  async send(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.conversations.send(
      request.user!.sub,
      conversationId,
      dto.body,
      dto.replyToMessageId,
    );
    this.gateway.notifyNewMessage(conversationId, message);
    return { data: message };
  }

  @Post(':conversationId/read')
  async read(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: ReadReceiptDto,
  ) {
    const result = await this.conversations.markRead(request.user!.sub, conversationId, dto.messageId);
    this.gateway.notifyMessageUpdate(conversationId, 'message.read', {
      messageId: dto.messageId,
      userId: request.user!.sub,
    });
    return { data: result };
  }

  @Delete('messages/:messageId')
  async delete(@Req() request: AuthenticatedRequest, @Param('messageId') messageId: string) {
    return { data: await this.conversations.deleteOwnMessage(request.user!.sub, messageId) };
  }

  @Post('messages/:messageId/reactions')
  async react(
    @Req() request: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() dto: ReactionDto,
  ) {
    const reaction = await this.conversations.react(request.user!.sub, messageId, dto.reaction);
    this.gateway.notifyMessageUpdate(reaction.conversationId, 'message.reaction', reaction);
    return { data: reaction };
  }

  @Post(':conversationId/messages/:messageId/attachments/presign')
  async presignAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: AttachmentPresignDto,
  ) {
    return {
      data: await this.conversations.presignAttachment(
        request.user!.sub,
        conversationId,
        messageId,
        dto.mimeType,
        Number(dto.sizeBytes),
      ),
    };
  }

  @Post(':conversationId/messages/:messageId/attachments/complete')
  async completeAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: AttachmentCompleteDto,
  ) {
    return {
      data: await this.conversations.completeAttachment(
        request.user!.sub,
        conversationId,
        messageId,
        dto.storageKey,
        dto.mimeType,
        Number(dto.sizeBytes),
      ),
    };
  }
}
