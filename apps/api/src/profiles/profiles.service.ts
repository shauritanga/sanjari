import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { DiscoveryPreferenceDto, OnboardingUpdateDto, PromptAnswerDto } from './dto';
import { PhotoPresignDto } from './dto';
import { PhotoScanService } from './photo-scan.service';
import { StorageService } from './storage.service';

const bannedTerms = [
  'onlyfans',
  'escort',
  'sugar daddy',
  'sugar baby',
  'cashapp',
  'venmo me',
  'whatsapp me',
  'telegram me',
];

function hasSuspiciousLink(text: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s]+/i.test(text);
}

function hasBannedTerm(text: string): boolean {
  const normalized = text.toLowerCase();
  return bannedTerms.some((term) => normalized.includes(term));
}

/**
 * Lightweight automated content screen for profile text, mirroring the
 * suspicious-link check already used for messages. Flags obvious scam/spam
 * signals to human review rather than blindly approving every profile, but
 * does not hold clean profiles back the way photo review does — there's no
 * equivalent to nudity risk in plain text, so the safe default is to publish
 * immediately unless something is actually flagged.
 */
function screenProfileContent(displayName: string | null, biography: string | null): 'approved' | 'under_review' {
  const text = `${displayName ?? ''} ${biography ?? ''}`;
  if (hasSuspiciousLink(text) || hasBannedTerm(text)) return 'under_review';
  return 'approved';
}

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
  ].filter(Boolean).length;
  return Math.round((complete / profileFields.length) * 100);
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly photoScan: PhotoScanService,
  ) {}

  async getOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
          profile: {
          include: {
            interests: { include: { interest: true } },
            languages: { include: { language: true } },
            photos: true,
            cityRef: true,
          },
        },
      },
    });
    if (!user?.profile) {
      throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }

    const profile = user.profile;
    const currentScore = completionScore(profile);
    if (profile.completionScore !== currentScore) {
      await this.prisma.profile.update({ where: { userId }, data: { completionScore: currentScore } });
    }
    return {
      userId: user.id,
      onboardingStatus: profile.onboardingStatus,
      onboardingStep: profile.onboardingStep,
      completionScore: currentScore,
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
          countryCode: profile.countryCode,
          cityId: profile.cityId,
          cityName: profile.cityRef?.name ?? profile.city,
        heightCm: profile.heightCm,
        drinkingPreference: profile.drinkingPreference,
        smokingPreference: profile.smokingPreference,
        exercisePreference: profile.exercisePreference,
        childrenPreference: profile.childrenPreference,
        culturalPreference: profile.culturalPreference,
          voiceIntroKey: profile.voiceIntroKey,
          visibilitySettings: profile.visibilitySettings,
          interests: profile.interests.map((item) => item.interest.slug),
          languages: profile.languages.map((item) => item.language.code),
          photos: await Promise.all(
            profile.photos.map(async (photo) => ({
              id: photo.id,
              position: photo.position,
              isPrimary: photo.isPrimary,
              moderationStatus: photo.moderationStatus,
              url: await this.storage.presignDownload(photo.storageKey),
            })),
          ),
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

    let selectedCity: { id: string; countryCode: string; name: string } | null = null;
    if (input.cityId !== undefined) {
      selectedCity = await this.prisma.city.findFirst({
        where: { id: input.cityId, active: true, ...(input.countryCode ? { countryCode: input.countryCode.toUpperCase() } : {}) },
        select: { id: true, countryCode: true, name: true },
      });
      if (!selectedCity) throw new BadRequestException({ code: 'INVALID_CITY', message: 'Select a valid city from the location list.' });
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
        ...(selectedCity && { city: selectedCity.name, cityId: selectedCity.id, countryCode: selectedCity.countryCode }),
        ...(input.countryCode !== undefined && !selectedCity && { countryCode: input.countryCode.toUpperCase(), cityId: null }),
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
        // Editing an already-published profile should not silently unpublish it —
        // only move a fresh/in-progress profile forward to 'in_progress'.
        onboardingStatus: current.onboardingStatus === 'published' ? 'published' : 'in_progress',
      },
      include: { interests: true, languages: true, photos: true },
    });

    if (input.interests !== undefined || input.languages !== undefined) {
      const [interests, languages] = await Promise.all([
        input.interests === undefined
          ? Promise.resolve(null)
          : this.prisma.interest.findMany({ where: { slug: { in: input.interests } }, select: { id: true, slug: true } }),
        input.languages === undefined
          ? Promise.resolve(null)
          : this.prisma.language.findMany({ where: { code: { in: input.languages } }, select: { id: true, code: true } }),
      ]);
      if (interests && interests.length !== new Set(input.interests).size)
        throw new BadRequestException({ code: 'INVALID_INTEREST', message: 'One or more interests are invalid.' });
      if (languages && languages.length !== new Set(input.languages).size)
        throw new BadRequestException({ code: 'INVALID_LANGUAGE', message: 'One or more languages are invalid.' });
      if (interests) {
        await this.prisma.profileInterest.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.profileInterest.createMany({ data: interests.map((item) => ({ profileId: profile.id, interestId: item.id })) });
      }
      if (languages) {
        await this.prisma.profileLanguage.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.profileLanguage.createMany({ data: languages.map((item) => ({ profileId: profile.id, languageId: item.id })) });
      }
    }

    const refreshed = await this.prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { interests: true, languages: true, photos: true },
    });

    const score = completionScore(refreshed);
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
        message: 'Complete the required profile fields and add a photo before publishing it.',
        completionScore: score,
      });
    }

    const moderationStatus = screenProfileContent(profile.displayName, profile.biography);
    const published = await this.prisma.profile.update({
      where: { userId },
      data: {
        onboardingStatus: 'published',
        publishedAt: new Date(),
        completionScore: 100,
        moderationStatus,
      },
    });
    if (moderationStatus === 'under_review') {
      await this.prisma.auditLog.create({
        data: {
          userId,
          actorType: 'system',
          action: 'profile.flagged_for_review',
          metadata: { reason: 'automated_content_screen' },
        },
      });
    }
    return {
      userId,
      onboardingStatus: published.onboardingStatus,
      moderationStatus: published.moderationStatus,
      completionScore: 100,
    };
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
      select: { id: true, position: true, isPrimary: true, moderationStatus: true, storageKey: true },
    });
    await this.photoScan.enqueue(photo.id);
    await this.refreshCompletionScore(userId);
    await this.prisma.auditLog.create({
      data: {
        userId,
        actorType: 'user',
        action: 'profile.photo_uploaded',
        metadata: { photoId: photo.id },
      },
    });
    const { storageKey: key, ...rest } = photo;
    return { ...rest, url: await this.storage.presignDownload(key) };
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
    await this.refreshCompletionScore(userId);
    await this.prisma.auditLog.create({
      data: { userId, actorType: 'user', action: 'profile.photo_deleted', metadata: { photoId } },
    });
    return { deleted: true };
  }

  private async refreshCompletionScore(userId: string): Promise<void> {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { interests: true, languages: true, photos: true },
    });
    await this.prisma.profile.update({ where: { userId }, data: { completionScore: completionScore(profile) } });
  }

  async setDiscoveryPaused(userId: string, paused: boolean) {
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: { discoveryPausedAt: paused ? new Date() : null },
      select: { discoveryPausedAt: true },
    });
    return { paused: profile.discoveryPausedAt !== null };
  }

  async listPrompts(locale: string) {
    return this.prisma.profilePrompt.findMany({
      where: { locale, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, prompt: true, locale: true },
    });
  }

  async savePromptAnswers(userId: string, answers: PromptAnswerDto[]) {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });

    const promptIds = answers.map((item) => item.promptId);
    const prompts = await this.prisma.profilePrompt.findMany({
      where: { id: { in: promptIds }, active: true },
      select: { id: true },
    });
    if (prompts.length !== new Set(promptIds).size)
      throw new BadRequestException({ code: 'INVALID_PROMPT', message: 'One or more prompts are invalid.' });

    await this.prisma.$transaction([
      this.prisma.promptAnswer.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.promptAnswer.createMany({
        data: answers.map((item) => ({ profileId: profile.id, promptId: item.promptId, answer: item.answer })),
      }),
    ]);
    return this.prisma.promptAnswer.findMany({
      where: { profileId: profile.id },
      include: { prompt: { select: { prompt: true } } },
    });
  }

  async getDiscoveryPreference(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { discoveryPreference: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    return (
      profile.discoveryPreference ?? {
        minAge: 18,
        maxAge: 80,
        maxDistanceKm: 50,
        genders: [],
        intentions: [],
        languages: [],
        interests: [],
        verifiedOnly: false,
        showDistance: true,
      }
    );
  }

  async updateDiscoveryPreference(userId: string, input: DiscoveryPreferenceDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });

    if (
      input.minAge !== undefined &&
      input.maxAge !== undefined &&
      input.minAge > input.maxAge
    ) {
      throw new BadRequestException({
        code: 'INVALID_AGE_RANGE',
        message: 'Minimum age must not be greater than maximum age.',
      });
    }

    return this.prisma.discoveryPreference.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        minAge: input.minAge ?? 18,
        maxAge: input.maxAge ?? 80,
        maxDistanceKm: input.maxDistanceKm ?? 50,
        genders: input.genders ?? [],
        intentions: input.intentions ?? [],
        languages: input.languages ?? [],
        interests: input.interests ?? [],
        verifiedOnly: input.verifiedOnly ?? false,
        showDistance: input.showDistance ?? true,
      },
      update: {
        ...(input.minAge !== undefined && { minAge: input.minAge }),
        ...(input.maxAge !== undefined && { maxAge: input.maxAge }),
        ...(input.maxDistanceKm !== undefined && { maxDistanceKm: input.maxDistanceKm }),
        ...(input.genders !== undefined && { genders: input.genders }),
        ...(input.intentions !== undefined && { intentions: input.intentions }),
        ...(input.languages !== undefined && { languages: input.languages }),
        ...(input.interests !== undefined && { interests: input.interests }),
        ...(input.verifiedOnly !== undefined && { verifiedOnly: input.verifiedOnly }),
        ...(input.showDistance !== undefined && { showDistance: input.showDistance }),
      },
    });
  }

  async presignVoiceIntro(userId: string, input: { mimeType: string; sizeBytes: number }) {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' });
    return this.storage.presignVoiceIntro(userId, input.mimeType);
  }

  async completeVoiceIntro(userId: string, storageKey: string) {
    if (!storageKey.startsWith(`voice-intros/${userId}/`))
      throw new BadRequestException({
        code: 'INVALID_STORAGE_KEY',
        message: 'The uploaded voice introduction is invalid.',
      });
    await this.prisma.profile.update({ where: { userId }, data: { voiceIntroKey: storageKey } });
    return { voiceIntroKey: storageKey };
  }

  async deleteVoiceIntro(userId: string) {
    await this.prisma.profile.update({ where: { userId }, data: { voiceIntroKey: null } });
    return { deleted: true };
  }
}
