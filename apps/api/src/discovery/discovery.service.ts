import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

const rankingVersion = 'w04-rules-v1';

function age(dateOfBirth: Date): number {
  const now = new Date();
  let value = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  if (
    now.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() < dateOfBirth.getUTCDate())
  )
    value -= 1;
  return value;
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async discover(userId: string, cursor?: string) {
    const viewer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { discoveryPreference: true } } },
    });
    if (!viewer?.profile)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const preference = viewer.profile.discoveryPreference;
    const excluded = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT "blockedId" AS id FROM "Block" WHERE "blockerId" = ${userId}::uuid UNION SELECT "blockerId" AS id FROM "Block" WHERE "blockedId" = ${userId}::uuid UNION SELECT "receiverId" AS id FROM "Like" WHERE "senderId" = ${userId}::uuid UNION SELECT "receiverId" AS id FROM "Pass" WHERE "senderId" = ${userId}::uuid`;
    const excludedIds = new Set(excluded.map((item) => item.id));
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId, notIn: [...excludedIds] },
        status: 'active',
        profile: {
          is: {
            onboardingStatus: 'published',
            moderationStatus: 'approved',
            discoveryPausedAt: null,
          },
        },
      },
      include: {
        profile: {
          include: {
            photos: {
              where: { isPrimary: true, moderationStatus: 'approved' },
              select: { id: true, thumbnailKey: true },
            },
            discoveryPreference: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const filtered = candidates.filter((candidate) => {
      const candidateAge = age(candidate.dateOfBirth);
      return (
        candidateAge >= (preference?.minAge ?? 18) && candidateAge <= (preference?.maxAge ?? 80)
      );
    });
    const page = filtered.slice(
      cursor ? Number(cursor) || 0 : 0,
      (cursor ? Number(cursor) || 0 : 0) + 20,
    );
    const data = page.map((candidate) => {
      const sharedInterests = viewer.profile!.interestedIn.filter((value) =>
        candidate.profile!.interestedIn.includes(value),
      );
      const components = {
        sharedInterests: Math.min(sharedInterests.length * 15, 45),
        profileCompleteness: candidate.profile!.completionScore,
        verification: candidate.profile!.verificationStatus === 'verified' ? 20 : 0,
      };
      const score = Math.min(
        100,
        components.sharedInterests +
          Math.round(components.profileCompleteness * 0.35) +
          components.verification,
      );
      return {
        id: candidate.id,
        displayName: candidate.profile!.displayName,
        age: age(candidate.dateOfBirth),
        city: candidate.profile!.city,
        distanceCategory:
          candidate.profile!.city && candidate.profile!.city === viewer.profile!.city
            ? 'same_area'
            : 'not_shared',
        verificationStatus: candidate.profile!.verificationStatus,
        primaryPhoto: candidate.profile!.photos[0] ?? null,
        score,
        explanation: { rankingVersion, components },
      };
    });
    await Promise.all(
      data.map((candidate) =>
        this.prisma.recommendation.upsert({
          where: {
            userId_candidateUserId_rankingVersion: {
              userId,
              candidateUserId: candidate.id,
              rankingVersion,
            },
          },
          create: {
            userId,
            candidateUserId: candidate.id,
            rankingVersion,
            generationReason: 'mutual_preferences_and_profile_quality',
            scoreComponents: candidate.explanation.components,
            finalScore: candidate.score,
            shownAt: new Date(),
          },
          update: {
            scoreComponents: candidate.explanation.components,
            finalScore: candidate.score,
            shownAt: new Date(),
          },
        }),
      ),
    );
    return {
      data,
      nextCursor: page.length === 20 ? String((cursor ? Number(cursor) || 0 : 0) + 20) : null,
      rankingVersion,
    };
  }

  async like(
    userId: string,
    candidateId: string,
    input: { comment?: string; priority?: boolean; idempotencyKey?: string },
  ) {
    if (userId === candidateId)
      throw new BadRequestException({
        code: 'SELF_ACTION_NOT_ALLOWED',
        message: 'You cannot interact with your own profile.',
      });
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: { id: true, status: true },
    });
    if (!candidate || candidate.status !== 'active')
      throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND', message: 'Profile not found.' });
    return this.prisma.$transaction(async (tx) => {
      const like = await tx.like.upsert({
        where: { senderId_receiverId: { senderId: userId, receiverId: candidateId } },
        create: {
          senderId: userId,
          receiverId: candidateId,
          comment: input.comment ?? null,
          priority: input.priority ?? false,
          ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        },
        update: { comment: input.comment ?? null, priority: input.priority ?? false },
      });
      const reciprocal = await tx.like.findUnique({
        where: { senderId_receiverId: { senderId: candidateId, receiverId: userId } },
      });
      if (!reciprocal) {
        await tx.recommendation.updateMany({
          where: { userId, candidateUserId: candidateId, rankingVersion, userAction: null },
          data: { userAction: 'liked' },
        });
        return { liked: true, matched: false, likeId: like.id };
      }
      const [userAId, userBId] = [userId, candidateId].sort() as [string, string];
      const match = await tx.match.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: { status: 'active' },
      });
      await tx.recommendation.updateMany({
        where: { userId, candidateUserId: candidateId, rankingVersion, userAction: null },
        data: { userAction: 'liked', matchOutcome: 'matched' },
      });
      return { liked: true, matched: true, matchId: match.id, likeId: like.id };
    });
  }

  async pass(userId: string, candidateId: string, idempotencyKey?: string) {
    if (userId === candidateId)
      throw new BadRequestException({
        code: 'SELF_ACTION_NOT_ALLOWED',
        message: 'You cannot interact with your own profile.',
      });
    await this.prisma.pass.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId: candidateId } },
      create: {
        senderId: userId,
        receiverId: candidateId,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        ...(idempotencyKey ? { idempotencyKey } : {}),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.recommendation.updateMany({
      where: { userId, candidateUserId: candidateId, rankingVersion, userAction: null },
      data: { userAction: 'passed' },
    });
    return { passed: true, idempotencyKey: idempotencyKey ?? null };
  }
}
