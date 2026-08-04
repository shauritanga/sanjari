import {
  CheckmarkBadge01Icon,
  FavouriteIcon,
  IdVerifiedIcon,
  Location01Icon,
  Shield01Icon,
  UserIcon
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
import { SelectableCard } from '../../src/components/SelectableCard';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { ToggleRow } from '../../src/components/ToggleRow';
import { api } from '../../src/api';
import {
  GENDER_OPTIONS,
  INTENTION_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  WHO_TO_MEET_OPTIONS
} from '../../src/onboarding/options';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';
import { captureAndSubmitVerification, type VerificationCase, type VerificationType } from '../../src/verification';

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
  visibilitySettings?: {
    hideAge?: boolean;
    hideOnlineStatus?: boolean;
    hideReadReceipts?: boolean;
  };
  photos: PhotoItem[];
};
type Onboarding = { completionScore: number; onboardingStatus: string; age: number; profile: Profile };
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
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
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
  const filteredCountries = useMemo(() => {
    const normalized = countryQuery.trim().toLowerCase();
    if (!normalized) return countries;
    return countries.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [countries, countryQuery]);
  const filteredCities = useMemo(() => {
    const normalized = cityQuery.trim().toLowerCase();
    const cities = selectedCountry?.cities ?? [];
    if (!normalized) return cities;
    return cities.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [selectedCountry, cityQuery]);

  function latestVerificationFor(type: VerificationType) {
    return verificationCases.find((item) => item.type === type);
  }
  function verificationColorFor(status?: string) {
    if (status === 'approved') return colors.success;
    if (status === 'rejected') return colors.error;
    if (status) return colors.accent;
    return colors.textSecondary;
  }

  async function save() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
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
        hideAge: profile.visibilitySettings?.hideAge ?? false,
        hideOnlineStatus: profile.visibilitySettings?.hideOnlineStatus ?? false,
        hideReadReceipts: profile.visibilitySettings?.hideReadReceipts ?? false
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

  function selectCountry(country: CountryOption) {
    setProfile((current) => ({ ...current, countryCode: country.code, cityId: null, cityName: null, city: null }));
    setCityQuery('');
  }
  function selectCity(city: { id: string; name: string }) {
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
        primaryPhoto={primaryPhoto}
        initial={initial}
        theme={theme}
        loggingOut={loggingOut}
        photoVerified={selfieCase?.status === 'approved'}
        idVerified={idCase?.status === 'approved'}
        onEdit={() => router.push('/profile/edit')}
        onLogout={confirmLogout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to profile" onPress={() => router.back()}>
          <Text style={styles.backLabel}>Back to profile</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Edit profile</Text>

        <View style={styles.hero}>
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

        <View style={styles.progressRow}>
          <ProgressBar current={score} total={100} />
          <Text style={styles.progressLabel}>{score}% complete</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Saved</Text> : null}

        <Section title="Photos" hint="Lead with a clear photo that feels like you." theme={theme}>
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

        <Section title="Location" icon={Location01Icon} hint="Choose a broad area. Your exact address is never required." theme={theme}>
          <View style={styles.locationSummary}>
            <AppIcon icon={Location01Icon} color={colors.accent} size={18} />
            <Text style={styles.locationSummaryText}>
              {profile.cityName ?? profile.city ?? 'Choose a country, then a city'}
            </Text>
          </View>
          <AppTextInput label="Search countries" value={countryQuery} onChangeText={setCountryQuery} placeholder="Type a country name" />
          <View style={styles.choiceGrid}>
            {filteredCountries.map((country) => (
              <Choice
                key={country.code}
                label={country.name}
                active={country.code === profile.countryCode}
                onPress={() => selectCountry(country)}
                theme={theme}
              />
            ))}
          </View>
          {selectedCountry ? (
            <>
              <AppTextInput label="Search cities" value={cityQuery} onChangeText={setCityQuery} placeholder="Type a city name" />
              <View style={styles.choiceGrid}>
                {filteredCities.map((city) => (
                  <Choice
                    key={city.id}
                    label={city.name}
                    active={city.id === profile.cityId}
                    onPress={() => selectCity(city)}
                    theme={theme}
                  />
                ))}
              </View>
            </>
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

        <Section title="Privacy" icon={Shield01Icon} hint="Choose what other people can see." theme={theme}>
          <ToggleRow
            title="Hide my age"
            value={profile.visibilitySettings?.hideAge ?? false}
            onChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideAge: value }
              }))
            }
          />
          <ToggleRow
            title="Hide online status"
            value={profile.visibilitySettings?.hideOnlineStatus ?? false}
            onChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideOnlineStatus: value }
              }))
            }
          />
          <ToggleRow
            title="Hide read receipts"
            value={profile.visibilitySettings?.hideReadReceipts ?? false}
            onChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideReadReceipts: value }
              }))
            }
          />
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

        <AppButton label="Log out" variant="ghost" loading={loggingOut} onPress={confirmLogout} />
      </ScrollView>

      <View style={styles.footer}>
        <AppButton label={saving ? 'Saving...' : 'Save changes'} loading={saving} onPress={() => void save()} />
        {onboardingStatus !== 'published' ? (
          <AppButton
            label={publishing ? 'Publishing...' : 'Publish profile'}
            variant="secondary"
            loading={publishing}
            onPress={() => void publish()}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ProfileHub({
  profile,
  age,
  primaryPhoto,
  initial,
  theme,
  loggingOut,
  photoVerified,
  idVerified,
  onEdit,
  onLogout
}: {
  profile: Profile;
  age: number | null;
  primaryPhoto: PhotoItem | undefined;
  initial: string;
  theme: AppTheme;
  loggingOut: boolean;
  photoVerified: boolean;
  idVerified: boolean;
  onEdit: () => void;
  onLogout: () => void;
}) {
  const { colors, radius, spacing, typography } = theme;
  const styles = createHubStyles(theme);
  const displayName = profile.displayName || 'Your profile';

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

        <View style={styles.identity}>
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
        </View>

        <View style={styles.menu}>
          <HubRow icon={UserIcon} title="Edit profile" description="Update your photos, details, interests and preferences" onPress={onEdit} theme={theme} />
          <HubRow icon={Shield01Icon} title="Settings" description="Privacy, notifications and active devices" onPress={() => router.push('/settings')} theme={theme} />
          <HubRow icon={CheckmarkBadge01Icon} title="Safety and data" description="Request your data or schedule account deletion" onPress={() => router.push('/safety')} theme={theme} />
        </View>

        <View style={[styles.accountNote, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <AppIcon icon={IdVerifiedIcon} color={colors.accent} size={20} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.noteTitle}>Your account is yours</Text>
            <Text style={styles.noteBody}>Manage your profile, privacy and data whenever you need.</Text>
          </View>
        </View>

        <AppButton label="Log out" variant="ghost" loading={loggingOut} onPress={onLogout} />
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
  const { colors, spacing } = theme;
  const styles = createHubStyles(theme);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <AppIcon icon={icon} color={colors.textPrimary} size={22} />
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
        { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <View style={sectionStyles.titleRow}>
          {icon ? <AppIcon icon={icon} color={colors.accent} size={18} /> : null}
          <Text style={{ color: colors.accentAlt, fontSize: 17, fontWeight: '800' }}>{title}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function Labeled({ label, theme, children }: { label: string; theme: AppTheme; children: React.ReactNode }) {
  const { colors, spacing } = theme;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Choice({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: AppTheme }) {
  const { colors, radius, spacing } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        sectionStyles.choice,
        {
          borderRadius: radius.pill,
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.surfaceAlt : colors.surface,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs
        }
      ]}
    >
      <Text style={{ color: active ? colors.accentAlt : colors.textPrimary, fontWeight: active ? '700' : '500', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const sectionStyles = StyleSheet.create({
  section: { borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  choice: { borderWidth: 1 }
});

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    pageTitle: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: '800',
      color: colors.textPrimary
    },
    backLabel: { color: colors.accent, fontWeight: '700', fontSize: 15 },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
    progressRow: { gap: spacing.xs },
    progressLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    error: { color: colors.error, fontWeight: '600' },
    saved: { color: colors.success, fontWeight: '600' },
    fieldRow: { flexDirection: 'row', gap: spacing.sm },
    fieldHalf: { flex: 1, minWidth: 0 },
    locationSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    locationSummaryText: { color: colors.textSecondary },
    choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
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
    }
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
    identity: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
    avatar: { width: 104, height: 104, borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    initial: { color: colors.accentAlt, fontSize: 42, fontWeight: '800' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    name: { color: colors.textPrimary, fontSize: typography.h2.fontSize, fontWeight: '800' },
    handle: { color: colors.textSecondary, fontSize: typography.bodyMedium.fontSize },
    menu: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    row: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    rowTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    rowDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    chevron: { color: colors.textSecondary, fontSize: 28, fontWeight: '300' },
    accountNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, padding: spacing.md },
    noteTitle: { color: colors.textPrimary, fontWeight: '800' },
    noteBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    backLabel: { color: colors.accent, fontWeight: '700', fontSize: 15 }
  });
}
