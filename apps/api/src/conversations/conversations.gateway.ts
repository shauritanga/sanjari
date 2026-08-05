import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { ConversationsService } from './conversations.service';

type Client = {
  data: { userId?: string };
  handshake: { auth?: { token?: string } };
  rooms: Set<string>;
  join: (room: string) => void;
  leave: (room: string) => void;
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
  disconnect: (close?: boolean) => void;
};
type MessagePayload = { conversationId: string; body: string; replyToMessageId?: string };
type RecoveryPayload = { conversationId: string; cursor?: string };

@WebSocketGateway({ namespace: '/communications', cors: true })
export class ConversationsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
  ) {}

  async handleConnection(client: Client) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('Missing socket token');
      const claims = await this.jwt.verifyAsync<{ sub: string; type: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (claims.type !== 'access' || !claims.sub) throw new Error('Invalid socket token');
      client.data.userId = claims.sub;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation.join')
  async join(client: Client, payload: { conversationId: string }) {
    await this.conversations.authorize(this.userId(client), payload.conversationId);
    client.join(payload.conversationId);
    return { joined: true, conversationId: payload.conversationId };
  }

  @SubscribeMessage('conversation.leave')
  leave(client: Client, payload: { conversationId: string }) {
    client.leave(payload.conversationId);
    return { joined: false, conversationId: payload.conversationId };
  }

  @SubscribeMessage('message.send')
  async send(client: Client, payload: MessagePayload) {
    const message = await this.conversations.send(
      this.userId(client),
      payload.conversationId,
      payload.body,
      payload.replyToMessageId,
    );
    this.notifyNewMessage(payload.conversationId, message);
    return message;
  }

  @SubscribeMessage('messages.recover')
  async recover(client: Client, payload: RecoveryPayload) {
    return this.conversations.history(this.userId(client), payload.conversationId, payload.cursor);
  }

  @SubscribeMessage('conversation.typing')
  typing(client: Client, payload: { conversationId: string; active: boolean }) {
    const event = { conversationId: payload.conversationId, active: payload.active, userId: this.userId(client) };
    client.to(payload.conversationId).emit('conversation.typing', event);
    return event;
  }

  @SubscribeMessage('presence.update')
  async presence(client: Client, payload: { state: 'online' | 'away' | 'offline' }) {
    const userId = this.userId(client);
    // Broadcasting 'offline' is always allowed (it's the privacy-safe direction);
    // 'online' is suppressed server-side for anyone who has hidden their status,
    // so a compromised client can't bypass the setting.
    if (payload.state === 'online' && (await this.conversations.hidesOnlineStatus(userId))) {
      return { state: 'offline' as const, userId };
    }
    const event = { state: payload.state, userId };
    for (const room of client.rooms) {
      if (room !== client.data.userId) client.to(room).emit('presence.update', event);
    }
    return event;
  }

  notifyNewMessage(conversationId: string, message: unknown): void {
    this.server?.to(conversationId).emit('message.new', message);
  }

  notifyMessageUpdate(conversationId: string, event: string, payload: unknown): void {
    this.server?.to(conversationId).emit(event, payload);
  }

  private userId(client: Client): string {
    if (!client.data.userId) throw new Error('Socket is not authenticated');
    return client.data.userId;
  }
}
