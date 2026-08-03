import { create } from 'zustand';
import { api } from '../api';

export interface DiscoveryPreferenceDraft {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  genders: string[];
  intentions: string[];
  showDistance: boolean;
}

export interface PromptAnswerDraft {
  promptId: string;
  answer: string;
}

export interface OnboardingUpdateFields {
  displayName?: string;
  gender?: string;
  interestedIn?: string[];
  relationshipIntentions?: string[];
  biography?: string;
  city?: string;
  cityId?: string;
  countryCode?: string;
  interests?: string[];
  languages?: string[];
  hideAge?: boolean;
  hideOnlineStatus?: boolean;
  hideReadReceipts?: boolean;
}

interface OnboardingState {
  hydrated: boolean;
  onboardingStatus: string;
  onboardingStep: number;
  completionScore: number;
  age: number | null;
  displayName: string;
  gender: string;
  interestedIn: string[];
  relationshipIntentions: string[];
  biography: string;
  city: string;
  cityId: string | null;
  cityName: string;
  countryCode: string;
  interests: string[];
  languages: string[];
  hideAge: boolean;
  hideOnlineStatus: boolean;
  hideReadReceipts: boolean;
  photos: { id: string; position: number; isPrimary: boolean; moderationStatus: string }[];
  promptAnswers: PromptAnswerDraft[];
  discoveryPreference: DiscoveryPreferenceDraft;
  approximateLocationSet: boolean;
  notificationsEnabled: boolean;
  voiceIntroKey: string | null;
  hydrate: () => Promise<void>;
  saveOnboarding: (fields: OnboardingUpdateFields, step: number) => Promise<void>;
  setPromptAnswers: (answers: PromptAnswerDraft[]) => Promise<void>;
  setDiscoveryPreference: (prefs: Partial<DiscoveryPreferenceDraft>) => Promise<void>;
  setPhotos: (photos: OnboardingState['photos']) => void;
  setApproximateLocationSet: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setVoiceIntroKey: (key: string | null) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hydrated: false,
  onboardingStatus: 'not_started',
  onboardingStep: 1,
  completionScore: 0,
  age: null,
  displayName: '',
  gender: '',
  interestedIn: [],
  relationshipIntentions: [],
  biography: '',
  city: '',
  cityId: null,
  cityName: '',
  countryCode: '',
  interests: [],
  languages: [],
  hideAge: false,
  hideOnlineStatus: false,
  hideReadReceipts: false,
  photos: [],
  promptAnswers: [],
  discoveryPreference: {
    minAge: 18,
    maxAge: 80,
    maxDistanceKm: 50,
    genders: [],
    intentions: [],
    showDistance: true
  },
  approximateLocationSet: false,
  notificationsEnabled: false,
  voiceIntroKey: null,

  hydrate: async () => {
    const result = await api.get<{
      onboardingStatus: string;
      onboardingStep: number;
      completionScore: number;
      age: number;
      profile: {
        displayName: string | null;
        gender: string | null;
        interestedIn: string[];
        relationshipIntentions: string[];
        biography: string | null;
        city: string | null;
        countryCode: string | null;
        cityId: string | null;
        cityName: string | null;
        interests: string[];
        languages: string[];
        voiceIntroKey: string | null;
        visibilitySettings: { hideAge?: boolean; hideOnlineStatus?: boolean; hideReadReceipts?: boolean } | null;
        photos: OnboardingState['photos'];
      };
    }>('/onboarding');
    const data = result.data;
    if (!data) return;
    set({
      hydrated: true,
      onboardingStatus: data.onboardingStatus,
      onboardingStep: data.onboardingStep,
      completionScore: data.completionScore,
      age: data.age,
      displayName: data.profile.displayName ?? '',
      gender: data.profile.gender ?? '',
      interestedIn: data.profile.interestedIn ?? [],
      relationshipIntentions: data.profile.relationshipIntentions ?? [],
      biography: data.profile.biography ?? '',
      city: data.profile.city ?? '',
      cityId: data.profile.cityId ?? null,
      cityName: data.profile.cityName ?? '',
      countryCode: data.profile.countryCode ?? '',
      interests: data.profile.interests ?? [],
      languages: data.profile.languages ?? [],
      voiceIntroKey: data.profile.voiceIntroKey ?? null,
      hideAge: data.profile.visibilitySettings?.hideAge ?? false,
      hideOnlineStatus: data.profile.visibilitySettings?.hideOnlineStatus ?? false,
      hideReadReceipts: data.profile.visibilitySettings?.hideReadReceipts ?? false,
      photos: data.profile.photos ?? []
    });

    try {
      const preference = await api.get<DiscoveryPreferenceDraft>('/onboarding/discovery-preferences');
      if (preference.data) set({ discoveryPreference: preference.data });
    } catch {
      // discovery preferences are optional until the user reaches that step
    }
  },

  saveOnboarding: async (fields, step) => {
    const result = await api.put<{ completionScore: number; onboardingStep: number; onboardingStatus: string }>(
      '/onboarding',
      { ...fields, step }
    );
    set((current) => ({
      ...current,
      ...fields,
      cityId: fields.cityId ?? current.cityId,
      completionScore: result.data?.completionScore ?? current.completionScore,
      onboardingStep: result.data?.onboardingStep ?? current.onboardingStep,
      onboardingStatus: result.data?.onboardingStatus ?? current.onboardingStatus
    }));
  },

  setPromptAnswers: async (answers) => {
    await api.put('/onboarding/prompts', { answers });
    set({ promptAnswers: answers });
  },

  setDiscoveryPreference: async (prefs) => {
    const merged = { ...get().discoveryPreference, ...prefs };
    await api.put('/onboarding/discovery-preferences', merged);
    set({ discoveryPreference: merged });
  },

  setPhotos: (photos) => set({ photos }),
  setApproximateLocationSet: (value) => set({ approximateLocationSet: value }),
  setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
  setVoiceIntroKey: (key) => set({ voiceIntroKey: key })
}));
