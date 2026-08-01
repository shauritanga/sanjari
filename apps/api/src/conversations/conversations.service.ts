import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentScanService } from './attachment-scan.service';

function hasSuspiciousLink(body: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s]+/i.test(body);
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentStorage: AttachmentStorageService,
    private readonly attachmentScan: AttachmentScanService,
  ) {}

  private async authorize(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        status: 'active',
        members: { some: { userId, archivedAt: null } },
        match: { status: 'active' },
      },
      include: { members: { select: { userId: true } } },
    });
    if (!conversation)
      throw new ForbiddenException({
        code: 'CONVERSATION_ACCESS_DENIED',
        message: 'You cannot access this conversation.',
      });
    const otherUserId = conversation.members.find((member) => member.userId !== userId)?.userId;
    if (!otherUserId)
      throw new ForbiddenException({
        code: 'CONVERSATION_ACCESS_DENIED',
        message: 'You cannot access this conversation.',
      });
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    if (blocked)
      throw new ForbiddenException({
        code: 'CONVERSATION_BLOCKED',
        message: 'Messaging is unavailable for this conversation.',
      });
    return conversation;
  }

  async list(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        conversation: {
          include: {
            members: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, body: true, senderId: true, createdAt: true, status: true },
            },
          },
        },
      },
    });
    return Promise.all(
      matches.map(async (match) => {
        const conversation =
          match.conversation ??
          (await this.prisma.conversation.create({
            data: {
              matchId: match.id,
              members: { create: [{ userId: match.userAId }, { userId: match.userBId }] },
            },
            include: {
              members: true,
              messages: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { id: true, body: true, senderId: true, createdAt: true, status: true },
              },
            },
          }));
        return {
          id: conversation.id,
          matchId: match.id,
          lastMessage: conversation.messages[0] ?? null,
        };
      }),
    );
  }

  async history(userId: string, conversationId: string, cursor?: string) {
    await this.authorize(userId, conversationId);
    const skip = cursor ? Number(cursor) || 0 : 0;
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: 30,
      select: {
        id: true,
        senderId: true,
        body: true,
        status: true,
        createdAt: true,
        attachments: {
          where: { status: 'approved' },
          select: { id: true, mimeType: true, sizeBytes: true },
        },
      },
    });
    return { data: messages, nextCursor: messages.length === 30 ? String(skip + 30) : null };
  }

  async send(userId: string, conversationId: string, body: string) {
    await this.authorize(userId, conversationId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        status: hasSuspiciousLink(body) ? 'pending_review' : 'sent',
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        body: true,
        status: true,
        createdAt: true,
      },
    });
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: { not: userId } },
    });
    if (member)
      await this.prisma.notification.create({
        data: {
          userId: member.userId,
          category: 'messages',
          channel: 'in_app',
          title: 'New message',
          body: 'You have a new message.',
        },
      });
    if (hasSuspiciousLink(body))
      await this.prisma.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'message.suspicious_link',
          metadata: { messageId: message.id },
        },
      });
    return message;
  }

  async markRead(userId: string, conversationId: string, messageId: string) {
    await this.authorize(userId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!message)
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found.' });
    await this.prisma.messageReceipt.upsert({
      where: { messageId_userId_type: { messageId, userId, type: 'read' } },
      create: { messageId, userId, type: 'read' },
      update: {},
    });
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { read: true };
  }

  async deleteOwnMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, senderId: userId },
      select: { id: true },
    });
    if (!message)
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found.' });
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedForSenderAt: new Date(), body: null },
    });
    return { deleted: true };
  }

  async react(userId: string, messageId: string, reaction: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message)
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found.' });
    await this.authorize(userId, message.conversationId);
    return this.prisma.messageReaction.upsert({
      where: { messageId_userId_reaction: { messageId, userId, reaction } },
      create: { messageId, userId, reaction },
      update: {},
    });
  }

  async presignAttachment(
    userId: string,
    conversationId: string,
    messageId: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    await this.authorize(userId, conversationId);
    if (
      !Number.isInteger(sizeBytes) ||
      !['image/jpeg', 'image/png', 'image/webp', 'audio/m4a', 'audio/mpeg'].includes(mimeType) ||
      sizeBytes < 1 ||
      sizeBytes > 25 * 1024 * 1024
    )
      throw new ForbiddenException({
        code: 'ATTACHMENT_NOT_ALLOWED',
        message: 'This attachment type or size is not allowed.',
      });
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId },
      select: { id: true },
    });
    if (!message)
      throw new ForbiddenException({
        code: 'ATTACHMENT_NOT_ALLOWED',
        message: 'Attachments can only be added to your own message.',
      });
    return this.attachmentStorage.presign(userId, mimeType);
  }

  async completeAttachment(
    userId: string,
    conversationId: string,
    messageId: string,
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    await this.authorize(userId, conversationId);
    if (
      !storageKey.startsWith(`messages/${userId}/`) ||
      !Number.isInteger(sizeBytes) ||
      !['image/jpeg', 'image/png', 'image/webp', 'audio/m4a', 'audio/mpeg'].includes(mimeType) ||
      sizeBytes < 1 ||
      sizeBytes > 25 * 1024 * 1024
    )
      throw new ForbiddenException({
        code: 'ATTACHMENT_NOT_ALLOWED',
        message: 'The attachment is invalid.',
      });
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId },
      select: { id: true },
    });
    if (!message)
      throw new ForbiddenException({
        code: 'ATTACHMENT_NOT_ALLOWED',
        message: 'Attachments can only be added to your own message.',
      });
    const attachment = await this.prisma.messageAttachment.create({
      data: { messageId, storageKey, mimeType, sizeBytes, status: 'pending_scan' },
      select: { id: true, status: true, mimeType: true, sizeBytes: true },
    });
    await this.attachmentScan.enqueue(attachment.id);
    return attachment;
  }
}
