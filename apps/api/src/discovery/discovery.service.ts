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
import { ProfilesService } from '../profiles/profiles.service';
import { StorageService } from '../profiles/storage.service';
import { DiscoveryEntitlementService } from './entitlement.service';
import type { ProtectedLocationDto } from './dto';

const rankingVersion = 'w04-rules-v1';

export interface VerificationFlags {
  photoVerified: boolean;
  ageVerified: boolean;
  idVerified: boolean;
}

interface VisibilitySettings {
  hideAge?: boolean;
  hideOnlineStatus?: boolean;
  hideReadReceipts?: boolean;
  hideCity?: boolean;
  hideOccupation?: boolean;
  hideEducation?: boolean;
  hideHeight?: boolean;
}

export function readVisibility(value: unknown): VisibilitySettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as VisibilitySettings;
}

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
    private readonly storage: StorageService,
    private readonly profiles: ProfilesService,
  ) {}

  async getSharedProfile(token: string) {
    return this.profiles.getByShareToken(token);
  }

  private async verificationFlagsFor(userIds: string[]): Promise<Map<string, VerificationFlags>> {
    const map = new Map<string, VerificationFlags>();
    if (userIds.length === 0) return map;
    const cases = await this.prisma.verificationCase.findMany({
      where: { userId: { in: userIds }, status: 'approved' },
      select: { userId: true, type: true },
    });
    for (const item of cases) {
      const flags = map.get(item.userId) ?? { photoVerified: false, ageVerified: false, idVerified: false };
      if (item.type === 'selfie_liveness') flags.photoVerified = true;
      // Age is proven against the identity document, so it shares that case's outcome.
      if (item.type === 'identity_document') {
        flags.ageVerified = true;
        flags.idVerified = true;
      }
      map.set(item.userId, flags);
    }
    return map;
  }

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

  async discover(
    userId: string,
    cursor?: string,
    filters?: { recentlyActive?: boolean; newMembers?: boolean },
  ) {
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
    >`SELECT "blockedId" AS id FROM "Block" WHERE "blockerId" = ${userId}::uuid UNION SELECT "blockerId" AS id FROM "Block" WHERE "blockedId" = ${userId}::uuid UNION SELECT "receiverId" AS id FROM "Like" WHERE "senderId" = ${userId}::uuid UNION SELECT "receiverId" AS id FROM "Pass" WHERE "senderId" = ${userId}::uuid AND ("expiresAt" IS NULL OR "expiresAt" > now())`;
    const excludedIds = new Set(excluded.map((item) => item.id));
    const likedByCandidate = await this.prisma.like.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
    });
    const likedByCandidateIds = likedByCandidate.map((item) => item.senderId);
    const recentlyActiveSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const newMemberSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId, notIn: [...excludedIds] },
        status: 'active',
        ...(filters?.recentlyActive ? { lastActiveAt: { gte: recentlyActiveSince } } : {}),
        ...(filters?.newMembers ? { createdAt: { gte: newMemberSince } } : {}),
        profile: {
          is: {
            onboardingStatus: 'published',
            moderationStatus: 'approved',
            discoveryPausedAt: null,
            ...(preference?.verifiedOnly ? { verificationStatus: 'verified' } : {}),
            ...(preference?.genders?.length ? { gender: { in: preference.genders } } : {}),
          },
        },
        // "Visible only to people I've liked" hides a candidate from discovery
        // unless that candidate has already liked the viewer.
        OR: [
          { profile: { is: { visibleToLikedOnly: false } } },
          { id: { in: likedByCandidateIds } },
        ],
      },
      include: {
        profile: {
          include: {
            photos: {
              where: { moderationStatus: 'approved' },
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
              select: { id: true, storageKey: true },
            },
            interests: { select: { interest: { select: { slug: true } } } },
            languages: { select: { language: { select: { code: true } } } },
            discoveryPreference: true,
            country: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const preferredLanguages = new Set(preference?.languages ?? []);
    const preferredInterests = new Set(preference?.interests ?? []);
    const filtered = candidates.filter((candidate) => {
      const candidateAge = age(candidate.dateOfBirth);
      const distanceKm = distanceMap.get(candidate.id);
      if (
        preferredLanguages.size > 0 &&
        !candidate.profile!.languages.some((item) => preferredLanguages.has(item.language.code))
      )
        return false;
      if (
        preferredInterests.size > 0 &&
        !candidate.profile!.interests.some((item) => preferredInterests.has(item.interest.slug))
      )
        return false;
      const candidateGenders = candidate.profile!.discoveryPreference?.genders ?? [];
      if (
        viewer.profile!.gender &&
        candidateGenders.length > 0 &&
        !candidateGenders.includes(viewer.profile!.gender)
      )
        return false;
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
    const verificationFlags = await this.verificationFlagsFor(page.map((candidate) => candidate.id));
    const data = await Promise.all(page.map(async (candidate) => {
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
      const primaryPhoto = candidate.profile!.photos[0];
      const visibility = readVisibility(candidate.profile!.visibilitySettings);
      return {
        id: candidate.id,
        displayName: candidate.profile!.displayName,
        age: visibility.hideAge ? null : age(candidate.dateOfBirth),
        city: visibility.hideCity ? null : candidate.profile!.city,
        countryCode: candidate.profile!.country?.code ?? null,
        countryName: candidate.profile!.country?.name ?? null,
        occupationCategory: visibility.hideOccupation ? null : candidate.profile!.occupationCategory,
        educationLevel: visibility.hideEducation ? null : candidate.profile!.educationLevel,
        heightCm: visibility.hideHeight ? null : candidate.profile!.heightCm,
        memberSince: candidate.createdAt,
        distanceCategory: this.distanceCategory(distanceMap.get(candidate.id)),
        verificationStatus: candidate.profile!.verificationStatus,
        verification: verificationFlags.get(candidate.id) ?? {
          photoVerified: false,
          ageVerified: false,
          idVerified: false,
        },
        primaryPhoto: primaryPhoto
          ? { id: primaryPhoto.id, url: await this.storage.presignDownload(primaryPhoto.storageKey) }
          : null,
        score,
        explanation: { rankingVersion, components },
      };
    }));
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
      select: {
        id: true,
        status: true,
        profile: {
          select: {
            displayName: true,
            photos: {
              where: { moderationStatus: 'approved' },
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
              select: { id: true, storageKey: true },
            },
          },
        },
      },
    });
    if (!candidate || candidate.status !== 'active')
      throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND', message: 'Profile not found.' });
    const matchedPrimaryPhoto = candidate.profile?.photos[0];
    const matchedPhoto = matchedPrimaryPhoto
      ? { id: matchedPrimaryPhoto.id, url: await this.storage.presignDownload(matchedPrimaryPhoto.storageKey) }
      : null;
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
      const conversation = await tx.conversation.upsert({
        where: { matchId: match.id },
        create: {
          matchId: match.id,
          members: { create: [{ userId: userAId }, { userId: userBId }] },
        },
        update: {},
        select: { id: true },
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
      return {
        liked: true,
        matched: true,
        matchId: match.id,
        conversationId: conversation.id,
        likeId: like.id,
        matchedUser: {
          id: candidate.id,
          displayName: candidate.profile?.displayName ?? null,
          primaryPhoto: matchedPhoto,
        },
      };
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

  async likesReceived(userId: string) {
    const excluded = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT "blockedId" AS id FROM "Block" WHERE "blockerId" = ${userId}::uuid UNION SELECT "blockerId" AS id FROM "Block" WHERE "blockedId" = ${userId}::uuid UNION SELECT "userAId" AS id FROM "Match" WHERE "userBId" = ${userId}::uuid AND status = 'active' UNION SELECT "userBId" AS id FROM "Match" WHERE "userAId" = ${userId}::uuid AND status = 'active'`;
    const excludedIds = new Set(excluded.map((item) => item.id));
    const likes = await this.prisma.like.findMany({
      where: { receiverId: userId, senderId: { notIn: [...excludedIds] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        comment: true,
        priority: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                city: true,
                verificationStatus: true,
                photos: {
                  where: { moderationStatus: 'approved' },
                  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                  select: { id: true, storageKey: true },
                },
              },
            },
          },
        },
      },
    });
    return Promise.all(
      likes
        .filter((like) => like.sender.profile)
        .map(async (like) => {
          const primaryPhoto = like.sender.profile!.photos[0];
          return {
            likeId: like.id,
            userId: like.sender.id,
            comment: like.comment,
            priority: like.priority,
            createdAt: like.createdAt,
            displayName: like.sender.profile!.displayName,
            city: like.sender.profile!.city,
            verificationStatus: like.sender.profile!.verificationStatus,
            primaryPhoto: primaryPhoto
              ? { id: primaryPhoto.id, url: await this.storage.presignDownload(primaryPhoto.storageKey) }
              : null,
          };
        }),
    );
  }

  async profileDetail(viewerId: string, targetUserId: string) {
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
    });
    if (blocked)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const target = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        status: 'active',
        profile: { is: { onboardingStatus: 'published', moderationStatus: 'approved' } },
      },
      include: {
        profile: {
          include: {
            photos: {
              where: { moderationStatus: 'approved' },
              orderBy: { position: 'asc' },
              select: { id: true, isPrimary: true, storageKey: true },
            },
            interests: { select: { interest: { select: { slug: true, labelEn: true } } } },
            languages: { select: { language: { select: { code: true, labelEn: true } } } },
            prompts: {
              select: { answer: true, prompt: { select: { prompt: true } } },
            },
            country: { select: { code: true, name: true } },
          },
        },
      },
    });
    if (!target?.profile)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const distances = await this.prisma.$queryRaw<
      Array<{ distanceKm: number }>
    >`WITH latest AS (SELECT DISTINCT ON ("userId") "userId", "protectedPointWkt" FROM "UserLocation" ORDER BY "userId", "createdAt" DESC) SELECT ST_Distance(ST_GeogFromText(viewer."protectedPointWkt"), ST_GeogFromText(candidate."protectedPointWkt")) / 1000 AS "distanceKm" FROM latest viewer JOIN latest candidate ON candidate."userId" = ${targetUserId}::uuid WHERE viewer."userId" = ${viewerId}::uuid`;
    const voiceIntroUrl = target.profile.voiceIntroKey
      ? await this.storage.presignDownload(target.profile.voiceIntroKey)
      : null;
    const photos = await Promise.all(
      target.profile.photos.map(async (photo) => ({
        id: photo.id,
        isPrimary: photo.isPrimary,
        url: await this.storage.presignDownload(photo.storageKey),
      })),
    );
    const verificationFlags = await this.verificationFlagsFor([target.id]);
    const visibility = readVisibility(target.profile.visibilitySettings);
    return {
      id: target.id,
      displayName: target.profile.displayName,
      age: visibility.hideAge ? null : age(target.dateOfBirth),
      city: visibility.hideCity ? null : target.profile.city,
      countryCode: target.profile.country?.code ?? null,
      countryName: target.profile.country?.name ?? null,
      occupationCategory: visibility.hideOccupation ? null : target.profile.occupationCategory,
      educationLevel: visibility.hideEducation ? null : target.profile.educationLevel,
      heightCm: visibility.hideHeight ? null : target.profile.heightCm,
      memberSince: target.createdAt,
      biography: target.profile.biography,
      verificationStatus: target.profile.verificationStatus,
      verification: verificationFlags.get(target.id) ?? {
        photoVerified: false,
        ageVerified: false,
        idVerified: false,
      },
      distanceCategory: this.distanceCategory(Number(distances[0]?.distanceKm) || undefined),
      photos,
      interests: target.profile.interests.map((item) => item.interest),
      languages: target.profile.languages.map((item) => item.language),
      prompts: target.profile.prompts.map((item) => ({
        prompt: item.prompt.prompt,
        answer: item.answer,
      })),
      voiceIntroUrl,
    };
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
