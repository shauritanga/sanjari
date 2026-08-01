import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { ConversationsService } from './conversations.service';
import { MessageHistoryQueryDto, ReadReceiptDto, SendMessageDto } from './dto';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

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
    return { data: await this.conversations.send(request.user!.sub, conversationId, dto.body) };
  }

  @Post(':conversationId/read')
  async read(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: ReadReceiptDto,
  ) {
    return {
      data: await this.conversations.markRead(request.user!.sub, conversationId, dto.messageId),
    };
  }

  @Delete('messages/:messageId')
  async delete(@Req() request: AuthenticatedRequest, @Param('messageId') messageId: string) {
    return { data: await this.conversations.deleteOwnMessage(request.user!.sub, messageId) };
  }
}
