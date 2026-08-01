import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { ConversationsService } from './conversations.service';

type Client = {
  data: { userId?: string };
  handshake: { auth?: { token?: string } };
  disconnect: (close?: boolean) => void;
};
type MessagePayload = { conversationId: string; body: string };
type RecoveryPayload = { conversationId: string; cursor?: string };

@WebSocketGateway({ namespace: '/communications', cors: true })
export class ConversationsGateway {
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

  @SubscribeMessage('message.send')
  async send(client: Client, payload: MessagePayload) {
    return this.conversations.send(this.userId(client), payload.conversationId, payload.body);
  }

  @SubscribeMessage('messages.recover')
  async recover(client: Client, payload: RecoveryPayload) {
    return this.conversations.history(this.userId(client), payload.conversationId, payload.cursor);
  }

  @SubscribeMessage('conversation.typing')
  typing(client: Client, payload: { conversationId: string; active: boolean }) {
    return {
      conversationId: payload.conversationId,
      active: payload.active,
      userId: this.userId(client),
    };
  }

  @SubscribeMessage('presence.update')
  presence(client: Client, payload: { state: 'online' | 'away' | 'offline' }) {
    return { state: payload.state, userId: this.userId(client) };
  }

  private userId(client: Client): string {
    if (!client.data.userId) throw new Error('Socket is not authenticated');
    return client.data.userId;
  }
}
