import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { readVisibility } from '../discovery/discovery.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentScanService } from './attachment-scan.service';

function hasSuspiciousLink(body: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s]+/i.test(body);
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentStorage: AttachmentStorageService,
    private readonly attachmentScan: AttachmentScanService,
  ) {}

  async authorize(userId: string, conversationId: string) {
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
        userA: {
          select: {
            id: true,
            lastActiveAt: true,
            profile: { select: { displayName: true, visibilitySettings: true } },
          },
        },
        userB: {
          select: {
            id: true,
            lastActiveAt: true,
            profile: { select: { displayName: true, visibilitySettings: true } },
          },
        },
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
        const other = match.userAId === userId ? match.userB : match.userA;
        const self = conversation.members.find((member) => member.userId === userId);
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            deletedForSenderAt: null,
            ...(self?.lastReadAt ? { createdAt: { gt: self.lastReadAt } } : {}),
          },
        });
        const otherHidesOnlineStatus = readVisibility(other.profile?.visibilitySettings).hideOnlineStatus;
        return {
          id: conversation.id,
          matchId: match.id,
          otherUser: {
            id: other.id,
            displayName: other.profile?.displayName ?? null,
            online: otherHidesOnlineStatus
              ? false
              : other.lastActiveAt != null && Date.now() - other.lastActiveAt.getTime() < ONLINE_THRESHOLD_MS,
            lastActiveAt: otherHidesOnlineStatus ? null : other.lastActiveAt,
          },
          lastMessage: conversation.messages[0] ?? null,
          unreadCount,
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
        replyToMessageId: true,
        replyTo: { select: { id: true, senderId: true, body: true } },
        attachments: {
          where: { status: 'approved' },
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
            waveform: true,
            durationSeconds: true,
          },
        },
        reactions: { select: { userId: true, reaction: true } },
        receipts: { select: { userId: true, type: true, createdAt: true } },
      },
    });
    // Fetching this history is itself proof of delivery — mark any of the other
    // participant's messages we don't already have a delivered receipt for.
    const undelivered = messages.filter(
      (message) =>
        message.senderId !== userId &&
        !message.receipts.some((receipt) => receipt.userId === userId && receipt.type === 'delivered'),
    );
    if (undelivered.length > 0) {
      await this.markDelivered(
        userId,
        conversationId,
        undelivered.map((message) => message.id),
      );
      for (const message of undelivered) {
        message.receipts.push({ userId, type: 'delivered', createdAt: new Date() });
      }
    }
    const withAttachmentUrls = await Promise.all(
      messages.map(async (message) => ({
        ...message,
        attachments: await Promise.all(
          message.attachments.map(async ({ storageKey, ...attachment }) => ({
            ...attachment,
            url: await this.attachmentStorage.presignDownload(storageKey),
          })),
        ),
      })),
    );
    return {
      data: withAttachmentUrls,
      nextCursor: messages.length === 30 ? String(skip + 30) : null,
      newlyDelivered: undelivered.map((message) => message.id),
    };
  }

  async send(userId: string, conversationId: string, body: string, replyToMessageId?: string) {
    await this.authorize(userId, conversationId);
    if (replyToMessageId) {
      const replyTarget = await this.prisma.message.findFirst({
        where: { id: replyToMessageId, conversationId },
        select: { id: true },
      });
      if (!replyTarget)
        throw new NotFoundException({
          code: 'REPLY_TARGET_NOT_FOUND',
          message: 'The message being replied to was not found.',
        });
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        status: hasSuspiciousLink(body) ? 'pending_review' : 'sent',
        ...(replyToMessageId ? { replyToMessageId } : {}),
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        body: true,
        status: true,
        replyToMessageId: true,
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
      await this.prisma.$transaction([
        this.prisma.auditLog.create({
          data: {
            userId,
            actorType: 'user',
            action: 'message.suspicious_link',
            metadata: { messageId: message.id },
          },
        }),
        this.prisma.riskSignal.create({
          data: {
            userId,
            type: 'external_link_in_message',
            severity: 'medium',
            metadata: { messageId: message.id },
          },
        }),
      ]);
    return message;
  }

  async markDelivered(userId: string, conversationId: string, messageIds: string[]) {
    await this.authorize(userId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: { id: { in: messageIds }, conversationId, senderId: { not: userId } },
      select: { id: true },
    });
    if (messages.length === 0) return { delivered: [] as string[] };
    await this.prisma.messageReceipt.createMany({
      data: messages.map((message) => ({ messageId: message.id, userId, type: 'delivered' })),
      skipDuplicates: true,
    });
    return { delivered: messages.map((message) => message.id) };
  }

  async hidesOnlineStatus(userId: string): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { visibilitySettings: true },
    });
    return Boolean(readVisibility(profile?.visibilitySettings).hideOnlineStatus);
  }

  async markRead(userId: string, conversationId: string, messageId: string) {
    await this.authorize(userId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!message)
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found.' });
    // Someone who has turned off read receipts doesn't send them either —
    // we still track lastReadAt for their own unread counts, just skip the
    // visible receipt the other participant would otherwise see.
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { visibilitySettings: true },
    });
    const sendsReadReceipts = !readVisibility(profile?.visibilitySettings).hideReadReceipts;
    if (sendsReadReceipts) {
      await this.prisma.messageReceipt.upsert({
        where: { messageId_userId_type: { messageId, userId, type: 'read' } },
        create: { messageId, userId, type: 'read' },
        update: {},
      });
    }
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { read: sendsReadReceipts };
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
    const created = await this.prisma.messageReaction.upsert({
      where: { messageId_userId_reaction: { messageId, userId, reaction } },
      create: { messageId, userId, reaction },
      update: {},
    });
    return { ...created, conversationId: message.conversationId };
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
    waveform?: number[],
    durationSeconds?: number,
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
      data: {
        messageId,
        storageKey,
        mimeType,
        sizeBytes,
        status: 'pending_scan',
        ...(waveform !== undefined && { waveform }),
        ...(durationSeconds !== undefined && { durationSeconds }),
      },
      select: { id: true, status: true, mimeType: true, sizeBytes: true, waveform: true, durationSeconds: true },
    });
    await this.attachmentScan.enqueue(attachment.id);
    return { ...attachment, messageId, url: await this.attachmentStorage.presignDownload(storageKey) };
  }
}
