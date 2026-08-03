import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

interface PromptOption {
  id: string;
  prompt: string;
  locale: string;
}

export default function ReviewScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const displayName = useOnboardingStore((state) => state.displayName);
  const age = useOnboardingStore((state) => state.age);
  const cityName = useOnboardingStore((state) => state.cityName);
  const biography = useOnboardingStore((state) => state.biography);
  const interests = useOnboardingStore((state) => state.interests);
  const photos = useOnboardingStore((state) => state.photos);
  const promptAnswers = useOnboardingStore((state) => state.promptAnswers);

  const [loading, setLoading] = useState(true);
  const [promptTexts, setPromptTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        await hydrate();
        const promptResult = await api.get<PromptOption[]>('/onboarding/prompts?locale=en');
        if (!cancelled && promptResult.data) {
          setPromptTexts(Object.fromEntries(promptResult.data.map((prompt) => [prompt.id, prompt.prompt])));
        }
      } catch {
        // Review is a best-effort preview — swallow lookup failures and fall back to raw data.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const initials = useMemo(() => {
    return (displayName || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [displayName]);

  const primaryPhoto = photos[0];

  if (loading) {
    return (
      <OnboardingScreen
        step={stepNumber('review')}
        title="Review your profile"
        subtitle="This is how others will see you."
        primaryLabel="Looks good, continue"
        primaryDisabled
        onPrimaryPress={() => {}}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen
      step={stepNumber('review')}
      title="Review your profile"
      subtitle="This is how others will see you."
      primaryLabel="Looks good, continue"
      onPrimaryPress={() => router.push('/onboarding/publish')}
    >
      <View style={[styles.card, { borderRadius: radius.xl, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/onboarding/photos')}
          style={{ alignItems: 'center', gap: spacing.sm }}
        >
          <View
            style={[
              styles.avatar,
              {
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceAlt,
                borderColor: primaryPhoto ? colors.accent : colors.border
              }
            ]}
          >
            <Text style={[styles.avatarInitials, { color: colors.accentAlt }]}>{initials}</Text>
          </View>
          {photos.length > 0 ? (
            <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
              {photos.length} photo{photos.length === 1 ? '' : 's'} added
            </Text>
          ) : (
            <Text style={[styles.photoCount, { color: colors.error }]}>No photos yet — tap to add</Text>
          )}
        </Pressable>

        <View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {displayName || 'Your name'}
            {age ? `, ${age}` : ''}
          </Text>
          {cityName ? <Text style={[styles.city, { color: colors.textSecondary }]}>{cityName}</Text> : null}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding/bio')}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Bio</Text>
          <Text style={[styles.bio, { color: colors.textPrimary }]}>
            {biography || 'No bio yet — tap to add one.'}
          </Text>
        </Pressable>

        {interests.length > 0 ? (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Interests</Text>
            <View style={[styles.chipWrap, { gap: spacing.sm }]}>
              {interests.map((interest) => (
                <View
                  key={interest}
                  style={[styles.chip, { borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md }]}
                >
                  <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {promptAnswers.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Prompts</Text>
            {promptAnswers.map((entry) => (
              <View key={entry.promptId} style={{ gap: 2 }}>
                <Text style={[styles.promptQuestion, { color: colors.accentAlt }]}>
                  {promptTexts[entry.promptId] ?? 'Prompt'}
                </Text>
                <Text style={[styles.promptAnswer, { color: colors.textPrimary }]}>{entry.answer}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  card: { borderWidth: 1 },
  avatar: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarInitials: { fontSize: 28, fontWeight: '800' },
  photoCount: { fontSize: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  city: { fontSize: 14, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  bio: { fontSize: 15, lineHeight: 21 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { height: 32, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  promptQuestion: { fontSize: 13, fontWeight: '700' },
  promptAnswer: { fontSize: 15, lineHeight: 21 }
});
