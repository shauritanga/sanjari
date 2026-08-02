import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';

type Profile = {
  displayName: string | null;
  city: string | null;
  biography: string | null;
  gender: string | null;
  interestedIn: string[];
  relationshipIntentions: string[];
};
type Onboarding = { completionScore: number; profile: Profile };

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>({
    displayName: '',
    city: '',
    biography: '',
    gender: '',
    interestedIn: [],
    relationshipIntentions: [],
  });
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    void api
      .get<Onboarding>('/onboarding')
      .then((result) => {
        if (result.data) {
          setProfile(result.data.profile);
          setScore(result.data.completionScore);
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load profile.'),
      );
  }, []);
  async function save() {
    setError('');
    setSaved(false);
    try {
      const result = await api.put<{ completionScore: number }>('/onboarding', {
        step: 4,
        ...(profile.displayName !== null ? { displayName: profile.displayName } : {}),
        ...(profile.gender !== null ? { gender: profile.gender } : {}),
        interestedIn: profile.interestedIn,
        relationshipIntentions: profile.relationshipIntentions,
        ...(profile.biography !== null ? { biography: profile.biography } : {}),
        ...(profile.city !== null ? { city: profile.city } : {}),
      });
      setScore(result.data?.completionScore ?? score);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile.');
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
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.score}>{score}% complete</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Saved</Text> : null}
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
          label="City or broad area"
          value={profile.city ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, city: value }))}
        />
        <AppTextInput
          label="Biography"
          value={profile.biography ?? ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, biography: value }))}
        />
        <AppButton
          label="Save profile"
          onPress={() => {
            void save();
          }}
        />
        <AppButton
          label={paused ? 'Resume discovery' : 'Pause discovery'}
          variant="secondary"
          onPress={() => {
            void togglePause();
          }}
        />
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Verification badges describe the check performed. They do not guarantee someone&apos;s
            character or safety.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  score: { color: theme.colors.coral, fontWeight: '700' },
  saved: { color: theme.colors.success },
  error: { color: theme.colors.error },
  note: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.softRose,
    borderRadius: theme.radius.md,
  },
  noteText: { color: theme.colors.deepPlum, lineHeight: 20 },
});
