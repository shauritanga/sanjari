import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { OnboardingUpdateDto } from './dto';
import { PhotoPresignDto } from './dto';
import { StorageService } from './storage.service';

const profileFields = [
  'displayName',
  'gender',
  'interestedIn',
  'relationshipIntentions',
  'biography',
  'city',
  'interests',
  'languages',
  'photos',
  'verification',
] as const;

type ProfileSnapshot = {
  displayName: string | null;
  gender: string | null;
  interestedIn: string[];
  relationshipIntentions: string[];
  biography: string | null;
  city: string | null;
  verificationStatus: string;
  interests: { interestId: string }[];
  languages: { languageId: string }[];
  photos: { id: string }[];
};

function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDelta = now.getUTCDate() - dateOfBirth.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) age -= 1;
  return age;
}

function completionScore(profile: ProfileSnapshot): number {
  const complete = [
    Boolean(profile.displayName),
    Boolean(profile.gender),
    profile.interestedIn.length > 0,
    profile.relationshipIntentions.length > 0,
    Boolean(profile.biography),
    Boolean(profile.city),
    profile.interests.length > 0,
    profile.languages.length > 0,
    profile.photos.length > 0,
    profile.verificationStatus === 'verified',
  ].filter(Boolean).length;
  return Math.round((complete / profileFields.length) * 100);
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: { interests: true, languages: true, photos: true },
        },
      },
    });
    if (!user?.profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }

    const profile = user.profile;
    return {
      userId: user.id,
      onboardingStatus: profile.onboardingStatus,
      onboardingStep: profile.onboardingStep,
      completionScore: profile.completionScore,
      age: calculateAge(user.dateOfBirth),
      profile: {
        displayName: profile.displayName,
        pronouns: profile.pronouns,
        gender: profile.gender,
        interestedIn: profile.interestedIn,
        relationshipIntentions: profile.relationshipIntentions,
        biography: profile.biography,
        occupationCategory: profile.occupationCategory,
        educationLevel: profile.educationLevel,
        city: profile.city,
        heightCm: profile.heightCm,
        drinkingPreference: profile.drinkingPreference,
        smokingPreference: profile.smokingPreference,
        exercisePreference: profile.exercisePreference,
        childrenPreference: profile.childrenPreference,
        culturalPreference: profile.culturalPreference,
        visibilitySettings: profile.visibilitySettings,
      },
    };
  }

  async updateOnboarding(userId: string, input: OnboardingUpdateDto) {
    const current = await this.prisma.profile.findUnique({
      where: { userId },
      include: { interests: true, languages: true, photos: true },
    });
    if (!current) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.pronouns !== undefined && { pronouns: input.pronouns }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.interestedIn !== undefined && { interestedIn: input.interestedIn }),
        ...(input.relationshipIntentions !== undefined && {
          relationshipIntentions: input.relationshipIntentions,
        }),
        ...(input.biography !== undefined && { biography: input.biography }),
        ...(input.occupationCategory !== undefined && {
          occupationCategory: input.occupationCategory,
        }),
        ...(input.educationLevel !== undefined && { educationLevel: input.educationLevel }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.heightCm !== undefined && { heightCm: input.heightCm }),
        ...(input.drinkingPreference !== undefined && {
          drinkingPreference: input.drinkingPreference,
        }),
        ...(input.smokingPreference !== undefined && {
          smokingPreference: input.smokingPreference,
        }),
        ...(input.exercisePreference !== undefined && {
          exercisePreference: input.exercisePreference,
        }),
        ...(input.childrenPreference !== undefined && {
          childrenPreference: input.childrenPreference,
        }),
        ...(input.culturalPreference !== undefined && {
          culturalPreference: input.culturalPreference,
        }),
        ...((input.hideAge !== undefined ||
          input.hideOnlineStatus !== undefined ||
          input.hideReadReceipts !== undefined) && {
          visibilitySettings: {
            ...(typeof current.visibilitySettings === 'object' &&
            current.visibilitySettings !== null &&
            !Array.isArray(current.visibilitySettings)
              ? current.visibilitySettings
              : {}),
            ...(input.hideAge !== undefined && { hideAge: input.hideAge }),
            ...(input.hideOnlineStatus !== undefined && {
              hideOnlineStatus: input.hideOnlineStatus,
            }),
            ...(input.hideReadReceipts !== undefined && {
              hideReadReceipts: input.hideReadReceipts,
            }),
          },
        }),
        onboardingStep: Math.max(current.onboardingStep, input.step ?? current.onboardingStep),
        onboardingStatus: 'in_progress',
      },
      include: { interests: true, languages: true, photos: true },
    });

    const score = completionScore({
      ...profile,
      interests: current.interests,
      languages: current.languages,
      photos: current.photos,
    });
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: { completionScore: score },
    });

    return {
      userId,
      onboardingStatus: updated.onboardingStatus,
      onboardingStep: updated.onboardingStep,
      completionScore: updated.completionScore,
    };
  }

  async publish(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { interests: true, languages: true, photos: true },
    });
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }

    const score = completionScore(profile);
    if (score < 100) {
      throw new BadRequestException({
        code: 'PROFILE_INCOMPLETE',
        message: 'Complete your profile before publishing it.',
        completionScore: score,
      });
    }

    const published = await this.prisma.profile.update({
      where: { userId },
      data: { onboardingStatus: 'published', publishedAt: new Date(), completionScore: 100 },
    });
    return { userId, onboardingStatus: published.onboardingStatus, completionScore: 100 };
  }

  async preview(userId: string) {
    return this.getOnboarding(userId);
  }

  async presignPhoto(userId: string, input: PhotoPresignDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const count = await this.prisma.profilePhoto.count({ where: { profileId: profile.id } });
    if (count >= 6)
      throw new BadRequestException({
        code: 'PHOTO_LIMIT_REACHED',
        message: 'You can add up to six profile photos.',
      });
    return this.storage.presignProfilePhoto(userId, input.mimeType);
  }

  async completePhoto(userId: string, storageKey: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile || !storageKey.startsWith(`profiles/${userId}/`))
      throw new BadRequestException({
        code: 'INVALID_STORAGE_KEY',
        message: 'The uploaded photo is invalid.',
      });
    const count = await this.prisma.profilePhoto.count({ where: { profileId: profile.id } });
    const photo = await this.prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        storageKey,
        position: count,
        isPrimary: count === 0,
        moderationStatus: 'pending',
        processingStatus: 'pending_scan',
      },
      select: { id: true, position: true, isPrimary: true, moderationStatus: true },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        actorType: 'user',
        action: 'profile.photo_uploaded',
        metadata: { photoId: photo.id },
      },
    });
    return photo;
  }

  async reorderPhotos(userId: string, photoIds: string[]) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    const photos = await this.prisma.profilePhoto.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    if (photos.length !== photoIds.length || photos.some((photo) => !photoIds.includes(photo.id)))
      throw new BadRequestException({
        code: 'INVALID_PHOTO_ORDER',
        message: 'Photo order does not match your profile photos.',
      });
    await this.prisma.$transaction(
      photoIds.map((id, position) =>
        this.prisma.profilePhoto.update({
          where: { id },
          data: { position, isPrimary: position === 0 },
        }),
      ),
    );
    return this.prisma.profilePhoto.findMany({
      where: { profileId: profile.id },
      orderBy: { position: 'asc' },
      select: { id: true, position: true, isPrimary: true, moderationStatus: true },
    });
  }

  async deletePhoto(userId: string, photoId: string) {
    const photo = await this.prisma.profilePhoto.findFirst({
      where: { id: photoId, profile: { userId } },
      select: { id: true, profileId: true },
    });
    if (!photo)
      throw new NotFoundException({ code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' });
    await this.prisma.profilePhoto.delete({ where: { id: photo.id } });
    await this.prisma.auditLog.create({
      data: { userId, actorType: 'user', action: 'profile.photo_deleted', metadata: { photoId } },
    });
    return { deleted: true };
  }

  async setDiscoveryPaused(userId: string, paused: boolean) {
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: { discoveryPausedAt: paused ? new Date() : null },
      select: { discoveryPausedAt: true },
    });
    return { paused: profile.discoveryPausedAt !== null };
  }
}
