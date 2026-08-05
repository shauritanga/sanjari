import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  CheckmarkBadge01Icon,
  CigaretteIcon,
  Dumbbell01Icon,
  EyeIcon,
  FavouriteIcon,
  IdVerifiedIcon,
  Location01Icon,
  Shield01Icon,
  SmileIcon,
  UserIcon,
  DrinkIcon
} from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { AppTextInput } from '../../src/components/AppTextInput';
import { ChipGroup } from '../../src/components/ChipGroup';
import { PhotoGrid, type PhotoItem } from '../../src/components/PhotoGrid';
import { ProgressBar } from '../../src/components/ProgressBar';
import { SearchableSelect } from '../../src/components/SearchableSelect';
import { SelectableCard } from '../../src/components/SelectableCard';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { ToggleRow } from '../../src/components/ToggleRow';
import { api } from '../../src/api';
import {
  CHILDREN_OPTIONS,
  DRINKING_OPTIONS,
  EXERCISE_OPTIONS,
  GENDER_OPTIONS,
  INTENTION_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  SMOKING_OPTIONS,
  WHO_TO_MEET_OPTIONS
} from '../../src/onboarding/options';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';
import { captureAndSubmitVerification, type VerificationCase, type VerificationType } from '../../src/verification';

type VisibilitySettings = {
  hideAge?: boolean;
  hideOnlineStatus?: boolean;
  hideReadReceipts?: boolean;
  hideCity?: boolean;
  hideOccupation?: boolean;
  hideEducation?: boolean;
  hideHeight?: boolean;
};

type Profile = {
  displayName: string | null;
  pronouns?: string | null;
  city: string | null;
  countryCode?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  biography: string | null;
  gender: string | null;
  interestedIn: string[];
  relationshipIntentions: string[];
  interests: string[];
  languages: string[];
  occupationCategory?: string | null;
  educationLevel?: string | null;
  heightCm?: number | null;
  drinkingPreference?: string | null;
  smokingPreference?: string | null;
  exercisePreference?: string | null;
  childrenPreference?: string | null;
  culturalPreference?: string | null;
  visibilitySettings?: VisibilitySettings;
  photos: PhotoItem[];
};
type Onboarding = {
  completionScore: number;
  onboardingStatus: string;
  age: number;
  memberSince?: string;
  profile: Profile;
};
interface CountryOption {
  code: string;
  name: string;
  cities: { id: string; name: string }[];
}

function statusLabel(status?: string) {
  switch (status) {
    case 'approved':
      return 'Verified';
    case 'submitted':
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Rejected — try again';
    default:
      return 'Not started';
  }
}

function publishLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Live';
    case 'in_progress':
      return 'Draft';
    default:
      return 'Not started';
  }
}

function memberSinceLabel(iso?: string) {
  if (!iso) return null;
  return `Member since ${new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

export default function ProfileScreen({ forceEdit = false }: { forceEdit?: boolean }) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState<Profile>({
    displayName: '',
    city: '',
    biography: '',
    gender: '',
    interestedIn: [],
    relationshipIntentions: [],
    interests: [],
    languages: [],
    visibilitySettings: {},
    photos: []
  });
  const [age, setAge] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState<string | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [paused, setPaused] = useState(false);
  const [verificationCases, setVerificationCases] = useState<VerificationCase[]>([]);
  const [requesting, setRequesting] = useState<VerificationType | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState('not_started');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = forceEdit || edit === '1';

  useEffect(() => {
    void api
      .get<Onboarding>('/onboarding')
      .then((result) => {
        if (result.data) {
          setProfile({ ...result.data.profile, photos: result.data.profile.photos ?? [] });
          setScore(result.data.completionScore);
          setOnboardingStatus(result.data.onboardingStatus);
          setAge(result.data.age);
          setMemberSince(result.data.memberSince);
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load profile.'));
    void api
      .get<CountryOption[]>('/catalog/locations')
      .then((result) => setCountries(result.data ?? []))
      .catch(() => setError('Unable to load the location list.'));
    void api
      .get<VerificationCase[]>('/onboarding/verification')
      .then((result) => setVerificationCases(result.data ?? []))
      .catch(() => undefined);
  }, []);

  const selectedCountry = useMemo(
    () => countries.find((item) => item.code === profile.countryCode) ?? null,
    [countries, profile.countryCode]
  );
  const countryOptions = useMemo(
    () => countries.map((country) => ({ value: country.code, label: country.name })),
    [countries]
  );
  const cityOptions = useMemo(
    () => (selectedCountry?.cities ?? []).map((city) => ({ value: city.id, label: city.name })),
    [selectedCountry]
  );

  function latestVerificationFor(type: VerificationType) {
    return verificationCases.find((item) => item.type === type);
  }
  function verificationColorFor(status?: string) {
    if (status === 'approved') return colors.success;
    if (status === 'rejected') return colors.error;
    if (status) return colors.accent;
    return colors.textSecondary;
  }

  function setVisibility(patch: Partial<VisibilitySettings>) {
    setSaved(false);
    setProfile((current) => ({
      ...current,
      visibilitySettings: { ...current.visibilitySettings, ...patch }
    }));
  }

  async function save() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const visibility = profile.visibilitySettings ?? {};
      const result = await api.put<{ completionScore: number }>('/onboarding', {
        step: 4,
        ...(profile.displayName !== null ? { displayName: profile.displayName } : {}),
        ...(profile.pronouns !== null && profile.pronouns !== undefined ? { pronouns: profile.pronouns } : {}),
        ...(profile.gender !== null ? { gender: profile.gender } : {}),
        interestedIn: profile.interestedIn,
        relationshipIntentions: profile.relationshipIntentions,
        interests: profile.interests,
        languages: profile.languages,
        ...(profile.biography !== null ? { biography: profile.biography } : {}),
        ...(profile.occupationCategory !== null && profile.occupationCategory !== undefined
          ? { occupationCategory: profile.occupationCategory }
          : {}),
        ...(profile.educationLevel !== null && profile.educationLevel !== undefined
          ? { educationLevel: profile.educationLevel }
          : {}),
        ...(profile.city !== null ? { city: profile.city } : {}),
        ...(profile.countryCode ? { countryCode: profile.countryCode } : {}),
        ...(profile.cityId ? { cityId: profile.cityId } : {}),
        ...(profile.heightCm !== undefined ? { heightCm: profile.heightCm } : {}),
        ...(profile.drinkingPreference !== null && profile.drinkingPreference !== undefined
          ? { drinkingPreference: profile.drinkingPreference }
          : {}),
        ...(profile.smokingPreference !== null && profile.smokingPreference !== undefined
          ? { smokingPreference: profile.smokingPreference }
          : {}),
        ...(profile.exercisePreference !== null && profile.exercisePreference !== undefined
          ? { exercisePreference: profile.exercisePreference }
          : {}),
        ...(profile.childrenPreference !== null && profile.childrenPreference !== undefined
          ? { childrenPreference: profile.childrenPreference }
          : {}),
        ...(profile.culturalPreference !== null && profile.culturalPreference !== undefined
          ? { culturalPreference: profile.culturalPreference }
          : {}),
        hideAge: visibility.hideAge ?? false,
        hideOnlineStatus: visibility.hideOnlineStatus ?? false,
        hideReadReceipts: visibility.hideReadReceipts ?? false,
        hideCity: visibility.hideCity ?? false,
        hideOccupation: visibility.hideOccupation ?? false,
        hideEducation: visibility.hideEducation ?? false,
        hideHeight: visibility.hideHeight ?? false
      });
      setScore(result.data?.completionScore ?? score);
      setOnboardingStatus((current) => (current === 'published' ? 'published' : 'in_progress'));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setError('');
    setPublishing(true);
    try {
      const result = await api.post<{ completionScore: number; onboardingStatus: string }>('/onboarding/publish', {});
      setScore(result.data?.completionScore ?? score);
      setOnboardingStatus(result.data?.onboardingStatus ?? 'published');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Complete the required fields before publishing.');
    } finally {
      setPublishing(false);
    }
  }

  async function togglePause() {
    try {
      const result = await api.request<{ paused: boolean }>('/onboarding/discovery-pause', {
        method: 'PATCH',
        body: JSON.stringify({ paused: !paused })
      });
      setPaused(result.data?.paused ?? !paused);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update discovery.');
    }
  }

  async function requestVerification(type: VerificationType) {
    setError('');
    setRequesting(type);
    try {
      const submitted = await captureAndSubmitVerification(type);
      if (submitted) {
        setVerificationCases((current) => [submitted, ...current.filter((item) => item.id !== submitted.id)]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit verification.');
    } finally {
      setRequesting(null);
    }
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'You can log back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void api.logout().finally(() => setLoggingOut(false));
        }
      }
    ]);
  }

  function selectCountry(countryCode: string) {
    setSaved(false);
    setProfile((current) => ({ ...current, countryCode, cityId: null, cityName: null, city: null }));
  }
  function selectCity(cityId: string) {
    const city = selectedCountry?.cities.find((item) => item.id === cityId);
    if (!city) return;
    setSaved(false);
    setProfile((current) => ({ ...current, cityId: city.id, cityName: city.name, city: city.name }));
  }

  const selfieCase = latestVerificationFor('selfie_liveness');
  const idCase = latestVerificationFor('identity_document');
  const primaryPhoto = profile.photos.find((photo) => photo.isPrimary) ?? profile.photos[0];
  const initial = (profile.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';

  if (!editing) {
    return (
      <ProfileHub
        profile={profile}
        age={age}
        memberSince={memberSince}
        primaryPhoto={primaryPhoto}
        initial={initial}
        theme={theme}
        loggingOut={loggingOut}
        score={score}
        photoVerified={selfieCase?.status === 'approved'}
        idVerified={idCase?.status === 'approved'}
        onEdit={() => router.push('/profile/edit')}
        onPreview={() => router.push('/profile/preview')}
        onLogout={confirmLogout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surfaceAlt }]}
            hitSlop={8}
          >
            <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preview my profile"
            onPress={() => router.push('/profile/preview')}
            style={[styles.previewChip, { backgroundColor: colors.surfaceAlt, borderRadius: theme.radius.pill }]}
          >
            <AppIcon icon={EyeIcon} color={colors.accentAlt} size={16} />
            <Text style={styles.previewChipLabel}>Preview</Text>
          </Pressable>
        </View>
        <Text style={styles.pageTitle}>Edit profile</Text>

        <View style={[styles.hero, styles.card]}>
          <View style={styles.heroAvatar}>
            {primaryPhoto?.url ? (
              <Image source={{ uri: primaryPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <Text style={styles.heroInitial}>{initial}</Text>
            )}
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {profile.displayName || 'Add your name'}
                {age ? `, ${age}` : ''}
              </Text>
              <VerificationBadge
                displayName={profile.displayName || 'You'}
                size={18}
                photoVerified={selfieCase?.status === 'approved'}
                ageVerified={idCase?.status === 'approved'}
                idVerified={idCase?.status === 'approved'}
              />
            </View>
            <View style={[styles.statusPill, onboardingStatus === 'published' ? styles.statusPillLive : styles.statusPillDraft]}>
              <Text style={onboardingStatus === 'published' ? styles.statusPillTextLive : styles.statusPillTextDraft}>
                {publishLabel(onboardingStatus)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.progressCard, styles.card]}>
          <View style={styles.progressRow}>
            <View style={styles.progressBarWrap}>
              <ProgressBar current={score} total={100} />
            </View>
            <Text style={styles.progressLabel}>{score}%</Text>
          </View>
          <Text style={styles.progressHint}>
            {score >= 100 ? "Your profile is complete." : 'Fill in a few more details to stand out.'}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Saved</Text> : null}

        <Section title="Photos" hint="Lead with a clear photo that feels like you. Tap a photo for more options." theme={theme}>
          <PhotoGrid
            photos={profile.photos}
            onChange={(photos) => setProfile((current) => ({ ...current, photos }))}
            slots={6}
          />
        </Section>

        <Section title="About you" icon={UserIcon} hint="Share the details people need to get to know you." theme={theme}>
          <AppTextInput
            label="Display name"
            value={profile.displayName ?? ''}
            onChangeText={(value) => {
              setSaved(false);
              setProfile((current) => ({ ...current, displayName: value }));
            }}
          />
          <Labeled label="Gender" theme={theme}>
            <ChipGroup
              options={GENDER_OPTIONS}
              selected={profile.gender ? [profile.gender] : []}
              onChange={(next) => setProfile((current) => ({ ...current, gender: next[0] ?? '' }))}
              multiple={false}
            />
          </Labeled>
          <AppTextInput
            label="Pronouns"
            value={profile.pronouns ?? ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, pronouns: value }))}
            placeholder="e.g. she/her, he/him, they/them"
            maxLength={40}
          />
          <AppTextInput
            label="Biography"
            value={profile.biography ?? ''}
            multiline
            maxLength={500}
            onChangeText={(value) => setProfile((current) => ({ ...current, biography: value }))}
          />
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <AppTextInput
                label="Occupation"
                value={profile.occupationCategory ?? ''}
                onChangeText={(value) => setProfile((current) => ({ ...current, occupationCategory: value }))}
              />
            </View>
            <View style={styles.fieldHalf}>
              <AppTextInput
                label="Education"
                value={profile.educationLevel ?? ''}
                onChangeText={(value) => setProfile((current) => ({ ...current, educationLevel: value }))}
              />
            </View>
          </View>
        </Section>

        <Section
          title="Lifestyle"
          icon={SmileIcon}
          hint="All optional — share as much or as little as you'd like."
          theme={theme}
        >
          <AppTextInput
            label="Height (cm)"
            value={profile.heightCm != null ? String(profile.heightCm) : ''}
            onChangeText={(value) => {
              const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
              setProfile((current) => ({ ...current, heightCm: digits ? Number(digits) : null }));
            }}
            keyboardType="number-pad"
            placeholder="e.g. 170"
            maxLength={3}
          />
          <Labeled label="Drinking" icon={DrinkIcon} theme={theme}>
            <ChipGroup
              options={DRINKING_OPTIONS}
              selected={profile.drinkingPreference ? [profile.drinkingPreference] : []}
              onChange={(next) => setProfile((current) => ({ ...current, drinkingPreference: next[0] ?? null }))}
              multiple={false}
            />
          </Labeled>
          <Labeled label="Smoking" icon={CigaretteIcon} theme={theme}>
            <ChipGroup
              options={SMOKING_OPTIONS}
              selected={profile.smokingPreference ? [profile.smokingPreference] : []}
              onChange={(next) => setProfile((current) => ({ ...current, smokingPreference: next[0] ?? null }))}
              multiple={false}
            />
          </Labeled>
          <Labeled label="Exercise" icon={Dumbbell01Icon} theme={theme}>
            <ChipGroup
              options={EXERCISE_OPTIONS}
              selected={profile.exercisePreference ? [profile.exercisePreference] : []}
              onChange={(next) => setProfile((current) => ({ ...current, exercisePreference: next[0] ?? null }))}
              multiple={false}
            />
          </Labeled>
          <Labeled label="Children" theme={theme}>
            <ChipGroup
              options={CHILDREN_OPTIONS}
              selected={profile.childrenPreference ? [profile.childrenPreference] : []}
              onChange={(next) => setProfile((current) => ({ ...current, childrenPreference: next[0] ?? null }))}
              multiple={false}
            />
          </Labeled>
          <AppTextInput
            label="Religious or cultural preference (optional)"
            value={profile.culturalPreference ?? ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, culturalPreference: value }))}
            placeholder="Share only if you'd like to"
            maxLength={80}
          />
        </Section>

        <Section title="Location" icon={Location01Icon} hint="Choose a broad area. Your exact address is never required." theme={theme}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose your country"
            onPress={() => setCountryPickerOpen(true)}
            style={[styles.dropdownField, { borderColor: colors.border, borderRadius: theme.radius.md }]}
          >
            <AppIcon icon={Location01Icon} color={colors.accent} size={18} />
            <Text style={styles.dropdownFieldText} numberOfLines={1}>
              {selectedCountry?.name ?? 'Choose a country'}
            </Text>
            <AppIcon icon={ArrowDown01Icon} color={colors.textSecondary} size={16} />
          </Pressable>
          {selectedCountry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose your city"
              onPress={() => setCityPickerOpen(true)}
              style={[styles.dropdownField, { borderColor: colors.border, borderRadius: theme.radius.md }]}
            >
              <AppIcon icon={Location01Icon} color={colors.accent} size={18} />
              <Text style={styles.dropdownFieldText} numberOfLines={1}>
                {profile.cityName ?? profile.city ?? 'Choose a city'}
              </Text>
              <AppIcon icon={ArrowDown01Icon} color={colors.textSecondary} size={16} />
            </Pressable>
          ) : null}
        </Section>

        <Section title="What you're looking for" icon={FavouriteIcon} hint="Tap to update any of these anytime." theme={theme}>
          <Labeled label="Interested in" theme={theme}>
            <ChipGroup
              options={WHO_TO_MEET_OPTIONS}
              selected={profile.interestedIn}
              onChange={(next) => setProfile((current) => ({ ...current, interestedIn: next }))}
            />
          </Labeled>
          <Labeled label="Relationship intentions" theme={theme}>
            <ChipGroup
              options={INTENTION_OPTIONS}
              selected={profile.relationshipIntentions}
              onChange={(next) => setProfile((current) => ({ ...current, relationshipIntentions: next }))}
              max={3}
            />
          </Labeled>
          <Labeled label="Interests" theme={theme}>
            <ChipGroup
              options={INTEREST_OPTIONS}
              selected={profile.interests}
              onChange={(next) => setProfile((current) => ({ ...current, interests: next }))}
              max={20}
            />
          </Labeled>
          <Labeled label="Languages" theme={theme}>
            <ChipGroup
              options={LANGUAGE_OPTIONS}
              selected={profile.languages}
              onChange={(next) => setProfile((current) => ({ ...current, languages: next }))}
              max={10}
            />
          </Labeled>
        </Section>

        <Section title="Privacy" icon={Shield01Icon} hint="Choose what other members can see on your profile." theme={theme}>
          <Labeled label="Hide from other members" theme={theme}>
            <ToggleRow
              title="Age"
              value={profile.visibilitySettings?.hideAge ?? false}
              onChange={(value) => setVisibility({ hideAge: value })}
            />
            <ToggleRow
              title="City"
              value={profile.visibilitySettings?.hideCity ?? false}
              onChange={(value) => setVisibility({ hideCity: value })}
            />
            <ToggleRow
              title="Occupation"
              value={profile.visibilitySettings?.hideOccupation ?? false}
              onChange={(value) => setVisibility({ hideOccupation: value })}
            />
            <ToggleRow
              title="Education"
              value={profile.visibilitySettings?.hideEducation ?? false}
              onChange={(value) => setVisibility({ hideEducation: value })}
            />
            <ToggleRow
              title="Height"
              value={profile.visibilitySettings?.hideHeight ?? false}
              onChange={(value) => setVisibility({ hideHeight: value })}
            />
          </Labeled>
          <Labeled label="Activity visibility" theme={theme}>
            <ToggleRow
              title="Online status"
              description="Hide the green dot and 'Online' label in chat."
              value={profile.visibilitySettings?.hideOnlineStatus ?? false}
              onChange={(value) => setVisibility({ hideOnlineStatus: value })}
            />
            <ToggleRow
              title="Read receipts"
              description="You also won't see when others have read your messages."
              value={profile.visibilitySettings?.hideReadReceipts ?? false}
              onChange={(value) => setVisibility({ hideReadReceipts: value })}
            />
          </Labeled>
          <Pressable style={styles.pauseAction} onPress={() => void togglePause()}>
            <Text style={styles.pauseActionText}>{paused ? 'Resume discovery' : 'Pause discovery'}</Text>
          </Pressable>
        </Section>

        <Section
          title="Verification"
          icon={CheckmarkBadge01Icon}
          hint="Verification badges describe the check performed, not someone's character or safety."
          theme={theme}
        >
          <SelectableCard
            title="Selfie verification"
            description={requesting === 'selfie_liveness' ? 'Uploading…' : statusLabel(selfieCase?.status)}
            icon={<AppIcon icon={CheckmarkBadge01Icon} color={verificationColorFor(selfieCase?.status)} size={24} />}
            selected={selfieCase?.status === 'approved'}
            onPress={() => {
              if (requesting || selfieCase?.status === 'approved') return;
              void requestVerification('selfie_liveness');
            }}
          />
          <SelectableCard
            title="ID verification"
            description={requesting === 'identity_document' ? 'Uploading…' : statusLabel(idCase?.status)}
            icon={<AppIcon icon={IdVerifiedIcon} color={verificationColorFor(idCase?.status)} size={24} />}
            selected={idCase?.status === 'approved'}
            onPress={() => {
              if (requesting || idCase?.status === 'approved') return;
              void requestVerification('identity_document');
            }}
          />
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <AppButton label={saving ? 'Saving...' : 'Save changes'} loading={saving} onPress={() => void save()} />
        </View>
        {onboardingStatus !== 'published' ? (
          <View style={styles.footerButton}>
            <AppButton
              label={publishing ? 'Publishing...' : 'Publish profile'}
              variant="secondary"
              loading={publishing}
              onPress={() => void publish()}
            />
          </View>
        ) : null}
      </View>

      <SearchableSelect
        visible={countryPickerOpen}
        title="Choose your country"
        placeholder="Search countries"
        options={countryOptions}
        selectedValue={profile.countryCode ?? null}
        onSelect={selectCountry}
        onClose={() => setCountryPickerOpen(false)}
        emptyLabel="No countries match your search."
      />
      <SearchableSelect
        visible={cityPickerOpen}
        title="Choose your city"
        placeholder="Search cities"
        options={cityOptions}
        selectedValue={profile.cityId ?? null}
        onSelect={selectCity}
        onClose={() => setCityPickerOpen(false)}
        emptyLabel="No cities match your search."
      />
    </SafeAreaView>
  );
}

function ProfileHub({
  profile,
  age,
  memberSince,
  primaryPhoto,
  initial,
  theme,
  loggingOut,
  score,
  photoVerified,
  idVerified,
  onEdit,
  onPreview,
  onLogout
}: {
  profile: Profile;
  age: number | null;
  memberSince: string | undefined;
  primaryPhoto: PhotoItem | undefined;
  initial: string;
  theme: AppTheme;
  loggingOut: boolean;
  score: number;
  photoVerified: boolean;
  idVerified: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onLogout: () => void;
}) {
  const { colors, radius, spacing, typography } = theme;
  const styles = createHubStyles(theme);
  const displayName = profile.displayName || 'Your profile';
  const since = memberSinceLabel(memberSince);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>ACCOUNT</Text>
            <Text style={[styles.title, { fontSize: typography.h1.fontSize }]}>Profile</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={[styles.settingsButton, { borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }]}
          >
            <AppIcon icon={Shield01Icon} color={colors.accentAlt} size={21} />
          </Pressable>
        </View>

        <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
          <View style={[styles.avatar, { borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}>
            {primaryPhoto?.url ? (
              <Image source={{ uri: primaryPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={styles.initial}>{initial}</Text>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}{age ? `, ${age}` : ''}</Text>
            <VerificationBadge
              displayName={displayName}
              size={18}
              photoVerified={photoVerified}
              ageVerified={idVerified}
              idVerified={idVerified}
            />
          </View>
          <Text style={styles.handle}>{profile.city ?? 'Sanjari member'}</Text>
          {since ? (
            <View style={styles.memberSinceRow}>
              <AppIcon icon={Calendar03Icon} color={colors.textSecondary} size={13} />
              <Text style={styles.memberSinceText}>{since}</Text>
            </View>
          ) : null}

          <View style={styles.completionRow}>
            <View style={styles.progressBarWrap}>
              <ProgressBar current={score} total={100} />
            </View>
            <Text style={styles.completionLabel}>{score}% complete</Text>
          </View>

          <View style={styles.identityActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onEdit}
              style={[styles.identityButton, styles.identityButtonPrimary, { backgroundColor: colors.accent, borderRadius: radius.pill }]}
            >
              <Text style={styles.identityButtonPrimaryLabel}>Edit profile</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onPreview}
              style={[styles.identityButton, styles.identityButtonSecondary, { borderColor: colors.border, borderRadius: radius.pill }]}
            >
              <AppIcon icon={EyeIcon} color={colors.accentAlt} size={16} />
              <Text style={styles.identityButtonSecondaryLabel}>Preview</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.menu}>
          <HubRow icon={Shield01Icon} title="Settings" description="Privacy, notifications and active devices" onPress={() => router.push('/settings')} theme={theme} />
          <HubRow icon={CheckmarkBadge01Icon} title="Safety and data" description="Deactivate, request your data, or delete your account" onPress={() => router.push('/safety')} theme={theme} />
        </View>

        <View style={[styles.accountNote, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <AppIcon icon={IdVerifiedIcon} color={colors.accent} size={20} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.noteTitle}>Your account is yours</Text>
            <Text style={styles.noteBody}>Manage your profile, privacy and data whenever you need.</Text>
          </View>
        </View>

        <View style={styles.logoutRow}>
          <AppButton label="Log out" variant="ghost" loading={loggingOut} onPress={onLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HubRow({
  icon,
  title,
  description,
  onPress,
  theme
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  title: string;
  description: string;
  onPress: () => void;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  const styles = createHubStyles(theme);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
        <AppIcon icon={icon} color={colors.accentAlt} size={20} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Section({
  title,
  hint,
  icon,
  theme,
  children
}: {
  title: string;
  hint: string;
  icon?: Parameters<typeof AppIcon>[0]['icon'];
  theme: AppTheme;
  children: React.ReactNode;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <View
      style={[
        sectionStyles.section,
        {
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg
        }
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <View style={sectionStyles.titleRow}>
          {icon ? (
            <View style={[sectionStyles.titleIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
              <AppIcon icon={icon} color={colors.accent} size={16} />
            </View>
          ) : null}
          <Text style={{ color: colors.accentAlt, fontSize: 17, fontWeight: '800' }}>{title}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function Labeled({
  label,
  icon,
  theme,
  children
}: {
  label: string;
  icon?: Parameters<typeof AppIcon>[0]['icon'];
  theme: AppTheme;
  children: React.ReactNode;
}) {
  const { colors, spacing } = theme;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <AppIcon icon={icon} color={colors.textSecondary} size={14} /> : null}
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: { borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }
});

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2
} as const;

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pageTitle: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: '800',
      color: colors.textPrimary
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center'
    },
    previewChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      height: 34
    },
    previewChipLabel: { color: colors.accentAlt, fontWeight: '700', fontSize: 13 },
    card: { ...cardShadow },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border
    },
    heroAvatar: {
      width: 84,
      height: 84,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    },
    heroInitial: { fontSize: 34, fontWeight: '800', color: colors.accentAlt },
    heroBody: { flex: 1, gap: spacing.xs },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroName: { fontSize: typography.h2.fontSize, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
    statusPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusPillLive: { backgroundColor: colors.success + '22' },
    statusPillDraft: { backgroundColor: colors.surfaceAlt },
    statusPillTextLive: { color: colors.success, fontSize: 12, fontWeight: '800' },
    statusPillTextDraft: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
    progressCard: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs
    },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    progressBarWrap: { flex: 1 },
    progressLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', minWidth: 34, textAlign: 'right' },
    progressHint: { color: colors.textSecondary, fontSize: 12 },
    error: { color: colors.error, fontWeight: '600' },
    saved: { color: colors.success, fontWeight: '600' },
    fieldRow: { flexDirection: 'row', gap: spacing.sm },
    fieldHalf: { flex: 1, minWidth: 0 },
    dropdownField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderWidth: 1
    },
    dropdownFieldText: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    pauseAction: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt
    },
    pauseActionText: { color: colors.accentAlt, fontWeight: '700', fontSize: 15 },
    footer: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background
    },
    footerButton: { flex: 1 }
  });
}

function createHubStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kicker: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
    title: { color: colors.textPrimary, fontWeight: '800' },
    settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    identityCard: {
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.lg,
      borderWidth: 1,
      ...cardShadow
    },
    avatar: { width: 104, height: 104, borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    initial: { color: colors.accentAlt, fontSize: 42, fontWeight: '800' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    name: { color: colors.textPrimary, fontSize: typography.h2.fontSize, fontWeight: '800' },
    handle: { color: colors.textSecondary, fontSize: typography.bodyMedium.fontSize },
    memberSinceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    memberSinceText: { color: colors.textSecondary, fontSize: 12 },
    completionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%', marginTop: spacing.md },
    progressBarWrap: { flex: 1 },
    completionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', minWidth: 34, textAlign: 'right' },
    identityActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, width: '100%' },
    identityButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6
    },
    identityButtonPrimary: {},
    identityButtonPrimaryLabel: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
    identityButtonSecondary: { borderWidth: 1 },
    identityButtonSecondaryLabel: { color: colors.accentAlt, fontWeight: '700', fontSize: 15 },
    menu: { gap: spacing.sm },
    row: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border
    },
    rowIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    rowDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    chevron: { color: colors.textSecondary, fontSize: 28, fontWeight: '300' },
    accountNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, padding: spacing.md },
    noteTitle: { color: colors.textPrimary, fontWeight: '800' },
    noteBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    logoutRow: { paddingTop: spacing.sm }
  });
}
