import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async unmatch(userId: string, matchId: string, reason?: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { conversation: { select: { id: true } } },
    });
    if (!match)
      throw new NotFoundException({ code: 'MATCH_NOT_FOUND', message: 'Match not found.' });
    if (match.userAId !== userId && match.userBId !== userId)
      throw new ForbiddenException({
        code: 'MATCH_ACCESS_DENIED',
        message: 'You cannot unmatch this pair.',
      });
    if (match.status !== 'active')
      return { id: match.id, status: match.status };
    const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.match.update({
        where: { id: matchId },
        data: { status: 'unmatched' },
        select: { id: true, status: true },
      });
      if (match.conversation) {
        await tx.conversation.update({
          where: { id: match.conversation.id },
          data: { status: 'closed' },
        });
      }
      await tx.auditLog.create({
        data: {
          userId,
          actorType: 'user',
          action: 'match.unmatched',
          metadata: { matchId, otherUserId, reason: reason ?? null },
        },
      });
      return result;
    });
    return updated;
  }

  async list(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, profile: { select: { displayName: true, city: true } } } },
        userB: { select: { id: true, profile: { select: { displayName: true, city: true } } } },
        conversation: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const blocked = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set(
      blocked.map((item) => (item.blockerId === userId ? item.blockedId : item.blockerId)),
    );
    return matches
      .map((match) => {
        const other = match.userAId === userId ? match.userB : match.userA;
        return {
          id: match.id,
          createdAt: match.createdAt,
          conversationId: match.conversation?.id ?? null,
          user: other,
        };
      })
      .filter((match) => !blockedIds.has(match.user.id));
  }
}
