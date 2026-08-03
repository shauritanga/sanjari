import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { DiscoveryEntitlementService } from './entitlement.service';
import type { ProtectedLocationDto } from './dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: DiscoveryEntitlementService,
  ) {}

  private async getMatchingWeights() {
    const row = await this.prisma.applicationConfiguration.findUnique({
      where: { key: 'matching.weights' },
    });
    const value = row?.value as
      | {
          sharedInterestWeight?: number;
          sharedInterestCap?: number;
          completenessWeight?: number;
          verificationBonus?: number;
        }
      | undefined;
    return {
      sharedInterestWeight: value?.sharedInterestWeight ?? 15,
      sharedInterestCap: value?.sharedInterestCap ?? 45,
      completenessWeight: value?.completenessWeight ?? 0.35,
      verificationBonus: value?.verificationBonus ?? 20,
    };
  }

  async discover(userId: string, cursor?: string) {
    const viewer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { discoveryPreference: true } } },
    });
    if (!viewer?.profile)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const preference = viewer.profile.discoveryPreference;
    const distances = await this.prisma.$queryRaw<
      Array<{ id: string; distanceKm: number }>
    >`WITH latest AS (SELECT DISTINCT ON ("userId") "userId", "protectedPointWkt" FROM "UserLocation" ORDER BY "userId", "createdAt" DESC) SELECT candidate."userId" AS id, ST_Distance(ST_GeogFromText(viewer."protectedPointWkt"), ST_GeogFromText(candidate."protectedPointWkt")) / 1000 AS "distanceKm" FROM latest viewer JOIN latest candidate ON candidate."userId" <> viewer."userId" WHERE viewer."userId" = ${userId}::uuid`;
    const distanceMap = new Map(distances.map((item) => [item.id, Number(item.distanceKm)]));
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
      const distanceKm = distanceMap.get(candidate.id);
      return (
        candidateAge >= (preference?.minAge ?? 18) &&
        candidateAge <= (preference?.maxAge ?? 80) &&
        (distanceKm === undefined || distanceKm <= (preference?.maxDistanceKm ?? 50))
      );
    });
    const page = filtered.slice(
      cursor ? Number(cursor) || 0 : 0,
      (cursor ? Number(cursor) || 0 : 0) + 20,
    );
    const weights = await this.getMatchingWeights();
    const data = page.map((candidate) => {
      const sharedInterests = viewer.profile!.interestedIn.filter((value) =>
        candidate.profile!.interestedIn.includes(value),
      );
      const components = {
        sharedInterests: Math.min(
          sharedInterests.length * weights.sharedInterestWeight,
          weights.sharedInterestCap,
        ),
        profileCompleteness: candidate.profile!.completionScore,
        verification:
          candidate.profile!.verificationStatus === 'verified' ? weights.verificationBonus : 0,
      };
      const score = Math.min(
        100,
        components.sharedInterests +
          Math.round(components.profileCompleteness * weights.completenessWeight) +
          components.verification,
      );
      return {
        id: candidate.id,
        displayName: candidate.profile!.displayName,
        age: age(candidate.dateOfBirth),
        city: candidate.profile!.city,
        distanceCategory: this.distanceCategory(distanceMap.get(candidate.id)),
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
    if (input.idempotencyKey) {
      const prior = await this.prisma.discoveryAction.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      });
      if (prior) {
        if (prior.targetUserId !== candidateId)
          throw new BadRequestException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'The idempotency key was already used for another target.',
          });
        const existingLike = await this.prisma.like.findUnique({
          where: { senderId_receiverId: { senderId: userId, receiverId: candidateId } },
          select: { id: true },
        });
        return { liked: true, matched: false, likeId: existingLike?.id ?? prior.id };
      }
    }
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: { id: true, status: true },
    });
    if (!candidate || candidate.status !== 'active')
      throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND', message: 'Profile not found.' });
    return this.prisma.$transaction(async (tx) => {
      await this.consumeDaily(tx, userId, 'like', 50);
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
        await tx.discoveryAction.create({
          data: {
            userId,
            targetUserId: candidateId,
            action: 'like',
            ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
          },
        });
        return { liked: true, matched: false, likeId: like.id };
      }
      const [userAId, userBId] = [userId, candidateId].sort() as [string, string];
      const match = await tx.match.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: { status: 'active' },
      });
      await tx.discoveryAction.create({
        data: {
          userId,
          targetUserId: candidateId,
          action: 'like',
          ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        },
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
    if (idempotencyKey) {
      const prior = await this.prisma.discoveryAction.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (prior) {
        if (prior.targetUserId !== candidateId)
          throw new BadRequestException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'The idempotency key was already used for another target.',
          });
        return { passed: true, idempotencyKey };
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await this.consumeDaily(tx, userId, 'pass', 200);
      await tx.pass.upsert({
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
      await tx.discoveryAction.create({
        data: {
          userId,
          targetUserId: candidateId,
          action: 'pass',
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });
      await tx.recommendation.updateMany({
        where: { userId, candidateUserId: candidateId, rankingVersion, userAction: null },
        data: { userAction: 'passed' },
      });
    });
    return { passed: true, idempotencyKey: idempotencyKey ?? null };
  }

  async undo(userId: string, targetUserId?: string) {
    if (!(await this.entitlements.canUndo(userId)))
      throw new ForbiddenException({
        code: 'UNDO_ENTITLEMENT_REQUIRED',
        message: 'Undo is available with an eligible plan.',
      });
    const action = await this.prisma.discoveryAction.findFirst({
      where: {
        userId,
        ...(targetUserId ? { targetUserId } : {}),
        undoneAt: null,
        createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!action)
      throw new NotFoundException({
        code: 'UNDO_NOT_AVAILABLE',
        message: 'There is no recent action to undo.',
      });
    await this.prisma.$transaction(async (tx) => {
      if (action.action === 'pass')
        await tx.pass.deleteMany({ where: { senderId: userId, receiverId: action.targetUserId } });
      if (action.action === 'like') {
        const reciprocal = await tx.like.findUnique({
          where: { senderId_receiverId: { senderId: action.targetUserId, receiverId: userId } },
        });
        if (reciprocal)
          throw new ForbiddenException({
            code: 'UNDO_MATCHED_ACTION',
            message: 'A matched action cannot be undone.',
          });
        await tx.like.deleteMany({ where: { senderId: userId, receiverId: action.targetUserId } });
      }
      await tx.discoveryAction.update({ where: { id: action.id }, data: { undoneAt: new Date() } });
      await tx.recommendation.updateMany({
        where: { userId, candidateUserId: action.targetUserId, rankingVersion },
        data: { userAction: null, matchOutcome: null },
      });
    });
    return { undone: true, targetUserId: action.targetUserId, action: action.action };
  }

  async updateLocation(userId: string, input: ProtectedLocationDto) {
    if (
      !/^SRID=4326;POINT\s*\(-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\)$/i.test(input.protectedPointWkt)
    ) {
      throw new BadRequestException({
        code: 'INVALID_PROTECTED_LOCATION',
        message: 'Protected location format is invalid.',
      });
    }
    const previous = await this.prisma.userLocation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const current = await this.prisma.userLocation.create({
      data: {
        userId,
        protectedPointWkt: input.protectedPointWkt,
        approximateCity: input.approximateCity ?? null,
        accuracyMeters: input.accuracyMeters ?? null,
        source: input.source,
      },
    });
    if (previous) {
      const [distance] = await this.prisma.$queryRaw<
        Array<{ distanceKm: number }>
      >`SELECT ST_Distance(ST_GeogFromText(${previous.protectedPointWkt}), ST_GeogFromText(${input.protectedPointWkt})) / 1000 AS "distanceKm"`;
      const elapsedMinutes = Math.max(
        1,
        Math.round((current.createdAt.getTime() - previous.createdAt.getTime()) / 60000),
      );
      const distanceKm = Number(distance?.distanceKm ?? 0);
      if (distanceKm > 100 && elapsedMinutes < 180) {
        const severity = distanceKm > 500 ? 'high' : 'medium';
        await this.prisma.locationAnomaly.create({
          data: {
            userId,
            previousLocationId: previous.id,
            currentLocationId: current.id,
            distanceKm,
            elapsedMinutes,
            severity,
          },
        });
        await this.prisma.riskSignal.create({
          data: {
            userId,
            type: 'location_velocity_anomaly',
            severity,
            metadata: { distanceKm, elapsedMinutes },
          },
        });
      }
    }
    return { saved: true, approximateCity: current.approximateCity };
  }

  private distanceCategory(distanceKm?: number): string {
    if (distanceKm === undefined) return 'not_shared';
    if (distanceKm <= 5) return 'nearby';
    if (distanceKm <= 25) return 'within_25km';
    if (distanceKm <= 50) return 'within_50km';
    return 'farther_away';
  }

  private async consumeDaily(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    limit: number,
  ) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const usage = await tx.discoveryDailyUsage.upsert({
      where: { userId_action_day: { userId, action, day } },
      create: { userId, action, day, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (usage.count > limit)
      throw new HttpException(
        {
          code: 'DAILY_ACTION_LIMIT',
          message: 'This action limit has been reached for today.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
