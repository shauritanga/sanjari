import { CheckmarkBadge01Icon, IdVerifiedIcon, Location01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { AppTextInput } from '../../src/components/AppTextInput';
import { ChipGroup } from '../../src/components/ChipGroup';
import { PhotoGrid, type PhotoItem } from '../../src/components/PhotoGrid';
import { SelectableCard } from '../../src/components/SelectableCard';
import { ToggleRow } from '../../src/components/ToggleRow';
import { api } from '../../src/api';
import {
  GENDER_OPTIONS,
  INTENTION_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  WHO_TO_MEET_OPTIONS
} from '../../src/onboarding/options';
import { useAppTheme } from '../../src/theme/useAppTheme';
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
type Onboarding = { completionScore: number; onboardingStatus: string; profile: Profile };
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

export default function ProfileScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
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
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [verificationCases, setVerificationCases] = useState<VerificationCase[]>([]);
  const [requesting, setRequesting] = useState<VerificationType | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState('not_started');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  useEffect(() => {
    void api
      .get<Onboarding>('/onboarding')
      .then((result) => {
        if (result.data) {
          setProfile({ ...result.data.profile, photos: result.data.profile.photos ?? [] });
          setScore(result.data.completionScore);
          setOnboardingStatus(result.data.onboardingStatus);
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
      setOnboardingStatus('in_progress');
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setError('');
    try {
      const result = await api.post<{ completionScore: number; onboardingStatus: string }>('/onboarding/publish', {});
      setScore(result.data?.completionScore ?? score);
      setOnboardingStatus(result.data?.onboardingStatus ?? 'published');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Complete the required fields before publishing.');
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

  function selectCountry(country: CountryOption) {
    setProfile((current) => ({ ...current, countryCode: country.code, cityId: null, cityName: null, city: null }));
    setCityQuery('');
  }
  function selectCity(city: { id: string; name: string }) {
    setProfile((current) => ({ ...current, cityId: city.id, cityName: city.name, city: city.name }));
  }

  const selfieCase = latestVerificationFor('selfie_liveness');
  const idCase = latestVerificationFor('identity_document');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={[styles.header, { gap: spacing.md }]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>Profile</Text>
            <Text
              style={{
                color: colors.accentAlt,
                fontSize: typography.h1.fontSize,
                lineHeight: typography.h1.lineHeight,
                fontWeight: typography.h1.fontWeight
              }}
            >
              Your profile
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.body.fontSize }}>
              {onboardingStatus === 'published' ? 'Submitted for review' : 'Complete your profile to submit it'}
            </Text>
          </View>
          <View
            style={[
              styles.completionBadge,
              { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minWidth: 76 }
            ]}
          >
            <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700' }}>{score}%</Text>
            <Text style={{ color: colors.accentAlt, fontSize: 12, fontWeight: '600' }}>complete</Text>
          </View>
        </View>

        {error ? <Text style={{ color: colors.error, fontWeight: '600' }}>{error}</Text> : null}
        {saved ? <Text style={{ color: colors.success, fontWeight: '600' }}>Saved</Text> : null}

        <Section title="Profile photos" hint="Lead with a clear photo that feels like you.">
          <PhotoGrid
            photos={profile.photos}
            onChange={(photos) => setProfile((current) => ({ ...current, photos }))}
            slots={6}
          />
        </Section>

        <Section title="About you" hint="Share the details people need to get to know you.">
          <AppTextInput
            label="Display name"
            value={profile.displayName ?? ''}
            onChangeText={(value) => {
              setSaved(false);
              setProfile((current) => ({ ...current, displayName: value }));
            }}
          />
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Gender</Text>
            <ChipGroup
              options={GENDER_OPTIONS}
              selected={profile.gender ? [profile.gender] : []}
              onChange={(next) => setProfile((current) => ({ ...current, gender: next[0] ?? '' }))}
              multiple={false}
            />
          </View>
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
        </Section>

        <Section title="Location" hint="Choose a broad area. Your exact address is never required.">
          <View style={[styles.locationSummary, { gap: spacing.sm }]}>
            <AppIcon icon={Location01Icon} color={colors.accent} size={18} />
            <Text style={{ color: colors.textSecondary }}>
              {profile.cityName ?? profile.city ?? 'Choose a country, then a city'}
            </Text>
          </View>
          <AppTextInput label="Search countries" value={countryQuery} onChangeText={setCountryQuery} placeholder="Type a country name" />
          <View style={[styles.choiceGrid, { gap: spacing.xs }]}>
            {filteredCountries.map((country) => (
              <Choice
                key={country.code}
                label={country.name}
                active={country.code === profile.countryCode}
                onPress={() => selectCountry(country)}
              />
            ))}
          </View>
          {selectedCountry ? (
            <>
              <AppTextInput label="Search cities" value={cityQuery} onChangeText={setCityQuery} placeholder="Type a city name" />
              <View style={[styles.choiceGrid, { gap: spacing.xs }]}>
                {filteredCities.map((city) => (
                  <Choice
                    key={city.id}
                    label={city.name}
                    active={city.id === profile.cityId}
                    onPress={() => selectCity(city)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Section>

        <Section title="Background" hint="These optional details add context to your profile.">
          <View style={[styles.fieldRow, { gap: spacing.sm }]}>
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

        <Section title="What you're looking for" hint="Tap to update any of these anytime.">
          <Labeled label="Interested in" color={colors.textPrimary}>
            <ChipGroup
              options={WHO_TO_MEET_OPTIONS}
              selected={profile.interestedIn}
              onChange={(next) => setProfile((current) => ({ ...current, interestedIn: next }))}
            />
          </Labeled>
          <Labeled label="Relationship intentions" color={colors.textPrimary}>
            <ChipGroup
              options={INTENTION_OPTIONS}
              selected={profile.relationshipIntentions}
              onChange={(next) => setProfile((current) => ({ ...current, relationshipIntentions: next }))}
              max={3}
            />
          </Labeled>
          <Labeled label="Interests" color={colors.textPrimary}>
            <ChipGroup
              options={INTEREST_OPTIONS}
              selected={profile.interests}
              onChange={(next) => setProfile((current) => ({ ...current, interests: next }))}
              max={20}
            />
          </Labeled>
          <Labeled label="Languages" color={colors.textPrimary}>
            <ChipGroup
              options={LANGUAGE_OPTIONS}
              selected={profile.languages}
              onChange={(next) => setProfile((current) => ({ ...current, languages: next }))}
              max={10}
            />
          </Labeled>
        </Section>

        <Section title="Privacy" hint="Choose what other people can see.">
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
        </Section>

        <Section title="Verification" hint="Verification badges describe the check performed, not someone's character or safety.">
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

        <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
          <AppButton label={saving ? 'Saving...' : 'Save profile'} loading={saving} onPress={() => void save()} />
          <AppButton label="Submit profile for review" variant="secondary" onPress={() => void publish()} />
          <Pressable
            style={[styles.pauseAction, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
            onPress={() => void togglePause()}
          >
            <Text style={{ color: colors.accentAlt, fontWeight: '700', fontSize: 16 }}>
              {paused ? 'Resume discovery' : 'Pause discovery'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.section,
        { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.accentAlt, fontSize: 18, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function Labeled({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const { spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.fieldLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.choice,
        {
          borderRadius: radius.sm,
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.surfaceAlt : colors.surface,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs
        }
      ]}
    >
      <Text style={{ color: active ? colors.accentAlt : colors.textPrimary, fontWeight: active ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {},
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  completionBadge: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  section: { borderWidth: 1 },
  fieldRow: { flexDirection: 'row' },
  fieldHalf: { flex: 1, minWidth: 0 },
  fieldLabel: { fontWeight: '600' },
  locationSummary: { flexDirection: 'row', alignItems: 'center' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  choice: { borderWidth: 1 },
  pauseAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }
});
