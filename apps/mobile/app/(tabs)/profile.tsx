import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';

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
  photos?: { id: string; moderationStatus?: string }[];
};
type Onboarding = { completionScore: number; onboardingStatus: string; profile: Profile };
type LocationCatalog = { code: string; name: string; cities: Array<{ id: string; name: string }> };
type VerificationCase = {
  id: string;
  type: 'selfie_liveness' | 'identity_document';
  status: string;
  provider: string;
};

export default function ProfileScreen() {
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
  });
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [verificationCases, setVerificationCases] = useState<VerificationCase[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState('not_started');
  const [locations, setLocations] = useState<LocationCatalog[]>([]);
  useEffect(() => {
    void api
      .get<Onboarding>('/onboarding')
      .then((result) => {
        if (result.data) {
          setProfile(result.data.profile);
          setScore(result.data.completionScore);
          setOnboardingStatus(result.data.onboardingStatus);
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load profile.'),
      );
  }, []);
  useEffect(() => {
    void api.get<LocationCatalog[]>('/catalog/locations')
      .then((result) => setLocations(result.data ?? []))
      .catch(() => setError('Unable to load the location list.'));
  }, []);
  useEffect(() => {
    void api
      .get<VerificationCase[]>('/onboarding/verification')
      .then((result) => setVerificationCases(result.data ?? []))
      .catch(() => undefined);
  }, []);
  async function save() {
    setError('');
    setSaved(false);
    try {
      const result = await api.put<{ completionScore: number }>('/onboarding', {
        step: 4,
        ...(profile.displayName !== null ? { displayName: profile.displayName } : {}),
        ...(profile.pronouns !== null && profile.pronouns !== undefined
          ? { pronouns: profile.pronouns }
          : {}),
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
        hideReadReceipts: profile.visibilitySettings?.hideReadReceipts ?? false,
      });
      setScore(result.data?.completionScore ?? score);
      setOnboardingStatus('in_progress');
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile.');
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
        body: JSON.stringify({ paused: !paused }),
      });
      setPaused(result.data?.paused ?? !paused);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update discovery.');
    }
  }
  async function requestVerification(type: VerificationCase['type']) {
    setError('');
    try {
      const result = await api.post<VerificationCase>(`/onboarding/verification/${type}/request`, {});
      if (result.data) setVerificationCases((current) => [result.data!, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request verification.');
    }
  }
  async function addPhoto() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const presign = await api.post<{ storageKey: string; uploadUrl: string }>(
        '/onboarding/photos/presign',
        { mimeType, sizeBytes: asset.fileSize ?? 1 },
      );
      if (!presign.data) throw new Error('Unable to prepare photo upload.');
      const upload = await fetch(presign.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: await new File(asset.uri).arrayBuffer(),
      });
      if (!upload.ok) throw new Error('Photo upload failed.');
      const completed = await api.post<{ id: string; moderationStatus: string }>(
        '/onboarding/photos/complete',
        { storageKey: presign.data.storageKey },
      );
      if (completed.data) {
        setProfile((current) => ({
          ...current,
          photos: [...(current.photos ?? []), completed.data!],
        }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.score}>{score}% complete</Text>
        <Text style={styles.status}>Status: {onboardingStatus === 'published' ? 'Submitted for review' : 'Complete your profile to submit it'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Saved</Text> : null}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Profile photos</Text>
          <Text style={styles.photoStatus}>
            {profile.photos?.length ?? 0} of 6 added. New photos are reviewed before publishing.
          </Text>
          <AppButton
            label={uploadingPhoto ? 'Uploading photo...' : 'Add profile photo'}
            variant="secondary"
            onPress={() => {
              void addPhoto();
            }}
          />
        </View>
        <AppTextInput
          label="Display name"
          value={profile.displayName ?? ''}
          onChangeText={(value) => {
            setSaved(false);
            setProfile((current) => ({ ...current, displayName: value }));
          }}
        />
        <AppTextInput
          label="Gender"
          value={profile.gender ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, gender: value }))}
        />
        <AppTextInput
          label="Pronouns"
          value={profile.pronouns ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, pronouns: value }))}
        />
        <LocationPicker
          locations={locations}
          countryCode={profile.countryCode ?? null}
          cityId={profile.cityId ?? null}
          selectedCity={profile.cityName ?? profile.city ?? null}
          onSelect={(countryCode, cityId, cityName) =>
            setProfile((current) => ({ ...current, countryCode, cityId, cityName, city: cityName }))
          }
        />
        <AppTextInput
          label="Biography"
          value={profile.biography ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, biography: value }))}
        />
        <AppTextInput
          label="Occupation"
          value={profile.occupationCategory ?? ''}
          onChangeText={(value) =>
            setProfile((current) => ({ ...current, occupationCategory: value }))
          }
        />
        <AppTextInput
          label="Education"
          value={profile.educationLevel ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, educationLevel: value }))}
        />
        <AppTextInput
          label="Interested in (comma separated)"
          value={profile.interestedIn.join(', ')}
          onChangeText={(value) =>
            setProfile((current) => ({ ...current, interestedIn: splitList(value) }))
          }
        />
        <AppTextInput
          label="Relationship intentions (comma separated)"
          value={profile.relationshipIntentions.join(', ')}
          onChangeText={(value) =>
            setProfile((current) => ({ ...current, relationshipIntentions: splitList(value) }))
          }
        />
        <AppTextInput
          label="Interests (slugs: music, travel, faith, fitness)"
          value={profile.interests.join(', ')}
          onChangeText={(value) => setProfile((current) => ({ ...current, interests: splitList(value) }))}
        />
        <AppTextInput
          label="Languages (codes: en, sw)"
          value={profile.languages.join(', ')}
          onChangeText={(value) => setProfile((current) => ({ ...current, languages: splitList(value) }))}
        />
        <View style={styles.visibilitySection}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <VisibilityRow
            label="Hide my age"
            value={profile.visibilitySettings?.hideAge ?? false}
            onValueChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideAge: value },
              }))
            }
          />
          <VisibilityRow
            label="Hide online status"
            value={profile.visibilitySettings?.hideOnlineStatus ?? false}
            onValueChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideOnlineStatus: value },
              }))
            }
          />
          <VisibilityRow
            label="Hide read receipts"
            value={profile.visibilitySettings?.hideReadReceipts ?? false}
            onValueChange={(value) =>
              setProfile((current) => ({
                ...current,
                visibilitySettings: { ...current.visibilitySettings, hideReadReceipts: value },
              }))
            }
          />
        </View>
        <View style={styles.verificationSection}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <Text style={styles.verificationNote}>
            Verification badges describe the check performed. They do not guarantee someone&apos;s
            character or safety.
          </Text>
          {verificationCases.map((item) => (
            <View key={item.id} style={styles.verificationRow}>
              <Text style={styles.visibilityLabel}>
                {item.type === 'selfie_liveness' ? 'Selfie check' : 'Identity document'}
              </Text>
              <Text style={styles.verificationStatus}>{item.status}</Text>
            </View>
          ))}
          <AppButton
            label="Request selfie verification"
            variant="secondary"
            onPress={() => {
              void requestVerification('selfie_liveness');
            }}
          />
          <AppButton
            label="Request identity review"
            variant="secondary"
            onPress={() => {
              void requestVerification('identity_document');
            }}
          />
        </View>
        <AppButton
          label="Save profile"
          onPress={() => {
            void save();
          }}
        />
        <AppButton
          label="Submit profile for review"
          variant="secondary"
          onPress={() => { void publish(); }}
        />
        <AppButton
          label={paused ? 'Resume discovery' : 'Pause discovery'}
          variant="secondary"
          onPress={() => {
            void togglePause();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function LocationPicker({
  locations,
  countryCode,
  cityId,
  selectedCity,
  onSelect,
}: {
  locations: LocationCatalog[];
  countryCode: string | null;
  cityId: string | null;
  selectedCity: string | null;
  onSelect: (countryCode: string, cityId: string, cityName: string) => void;
}) {
  const country = locations.find((item) => item.code === countryCode);
  return (
    <View style={styles.locationSection}>
      <Text style={styles.sectionTitle}>Country and city</Text>
      <Text style={styles.locationHint}>{selectedCity ?? 'Choose a country, then a major city'}</Text>
      <View style={styles.choiceGrid}>
        {locations.map((item) => (
          <Pressable key={item.code} style={[styles.choice, item.code === countryCode && styles.choiceSelected]} onPress={() => onSelect(item.code, '', '')}>
            <Text style={[styles.choiceText, item.code === countryCode && styles.choiceTextSelected]}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
      {country ? <View style={styles.choiceGrid}>
        {country.cities.map((city) => (
          <Pressable key={city.id} style={[styles.choice, city.id === cityId && styles.choiceSelected]} onPress={() => onSelect(country.code, city.id, city.name)}>
            <Text style={[styles.choiceText, city.id === cityId && styles.choiceTextSelected]}>{city.name}</Text>
          </Pressable>
        ))}
      </View> : null}
    </View>
  );
}

function VisibilityRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.visibilityRow}>
      <Text style={styles.visibilityLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E9DADD', true: theme.colors.coral }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  score: { color: theme.colors.coral, fontWeight: '700' },
  status: { color: theme.colors.secondaryText, fontSize: 14 },
  saved: { color: theme.colors.success },
  error: { color: theme.colors.error },
  locationSection: { gap: theme.spacing.sm },
  locationHint: { color: theme.colors.secondaryText },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  choice: { borderWidth: 1, borderColor: '#E9DADD', borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, backgroundColor: '#FFFFFF' },
  choiceSelected: { borderColor: theme.colors.coral, backgroundColor: theme.colors.softRose },
  choiceText: { color: theme.colors.charcoal },
  choiceTextSelected: { color: theme.colors.deepPlum, fontWeight: '700' },
  visibilitySection: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.softRose,
    borderRadius: theme.radius.md,
  },
  sectionTitle: { color: theme.colors.deepPlum, fontSize: 18, fontWeight: '700' },
  visibilityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visibilityLabel: { color: theme.colors.charcoal, fontSize: 16 },
  verificationSection: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.softRose,
    borderRadius: theme.radius.md,
  },
  verificationNote: { color: theme.colors.deepPlum, lineHeight: 20 },
  verificationRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationStatus: { color: theme.colors.coral, fontWeight: '700' },
  photoSection: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.softRose,
    borderRadius: theme.radius.md,
  },
  photoStatus: { color: theme.colors.deepPlum, lineHeight: 20 },
});
