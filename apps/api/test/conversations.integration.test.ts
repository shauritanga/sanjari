import { describe, expect, it, vi } from 'vitest';
import { ConversationsService } from '../src/conversations/conversations.service';

function prismaForMessage() {
  return {
    conversation: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: 'conversation-1',
          members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        }),
    },
    block: { findFirst: vi.fn().mockResolvedValue(null) },
    message: {
      create: vi
        .fn()
        .mockResolvedValue({
          id: 'message-1',
          conversationId: 'conversation-1',
          senderId: 'user-1',
          body: 'visit https://example.test',
          status: 'pending_review',
          createdAt: new Date(),
        }),
    },
    conversationMember: { findFirst: vi.fn().mockResolvedValue({ userId: 'user-2' }) },
    notification: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
}

describe('communication integration contracts', () => {
  it('holds suspicious links for review and audits the signal', async () => {
    const prisma = prismaForMessage();
    const result = await new ConversationsService(prisma as never).send(
      'user-1',
      'conversation-1',
      'visit https://example.test',
    );
    expect(result).toMatchObject({ id: 'message-1', status: 'pending_review' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-2',
          category: 'messages',
          channel: 'in_app',
          title: 'New message',
          body: 'You have a new message.',
        },
      }),
    );
  });

  it('denies conversation access after either member blocks the other', async () => {
    const prisma = prismaForMessage();
    prisma.block.findFirst.mockResolvedValue({ id: 'block-1' });
    await expect(
      new ConversationsService(prisma as never).send('user-1', 'conversation-1', 'hello'),
    ).rejects.toMatchObject({ response: { code: 'CONVERSATION_BLOCKED' } });
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('denies conversations that are not active matches', async () => {
    const prisma = prismaForMessage();
    prisma.conversation.findFirst.mockResolvedValue(null);
    await expect(
      new ConversationsService(prisma as never).history('user-1', 'conversation-1'),
    ).rejects.toMatchObject({ response: { code: 'CONVERSATION_ACCESS_DENIED' } });
  });
});
