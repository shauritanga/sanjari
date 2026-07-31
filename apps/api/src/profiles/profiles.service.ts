import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { OnboardingUpdateDto } from './dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
}
