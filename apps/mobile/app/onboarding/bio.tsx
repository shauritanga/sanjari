import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppTextInput } from '../../src/components/AppTextInput';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

const STARTERS = [
  'My ideal weekend...',
  "I'm passionate about...",
  'Ask me about...',
  'The way to win me over is...'
];

export default function BioScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const biography = useOnboardingStore((state) => state.biography);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);

  const [value, setValue] = useState(biography);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyStarter(starter: string) {
    if (value.trim().length > 0) return;
    setValue(`${starter} `);
  }

  async function handlePrimary() {
    const trimmed = value.trim();
    if (trimmed.length < 10) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ biography: trimmed }, stepNumber('bio'));
      router.push('/onboarding/interests');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your bio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('bio')}
      title="Write your bio"
      subtitle="Show your personality — you can always edit this later."
      primaryLabel="Continue"
      primaryDisabled={value.trim().length < 10}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      {...(error ? { footerNote: error } : {})}
    >
      <View style={[styles.chipsWrap, { gap: spacing.sm }]}>
        {STARTERS.map((starter) => (
          <Pressable
            key={starter}
            accessibilityRole="button"
            onPress={() => applyStarter(starter)}
            style={[
              styles.chip,
              { borderRadius: radius.pill, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md }
            ]}
          >
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>{starter}</Text>
          </Pressable>
        ))}
      </View>
      <AppTextInput
        label="About you"
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={500}
        placeholder="Tell people what makes you, you..."
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chipLabel: { fontSize: 13, fontWeight: '600' }
});
