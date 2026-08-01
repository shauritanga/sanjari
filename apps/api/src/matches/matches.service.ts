import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

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
