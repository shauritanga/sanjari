import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppTextInput } from '../../src/components/AppTextInput';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectableCard } from '../../src/components/SelectableCard';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { useOnboardingStore } from '../../src/store/onboarding';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
];

export default function GenderScreen() {
  const { spacing } = useAppTheme();
  const storedGender = useOnboardingStore((state) => state.gender);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const [selected, setSelected] = useState(storedGender || '');
  const [pronouns, setPronouns] = useState('');
  const [saving, setSaving] = useState(false);

  async function handlePrimary() {
    setSaving(true);
    try {
      await saveOnboarding(
        { gender: selected, ...(pronouns.trim() ? { pronouns: pronouns.trim() } : {}) } as Parameters<
          typeof saveOnboarding
        >[0],
        stepNumber('gender')
      );
      router.push('/onboarding/who-to-meet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('gender')}
      title="What's your gender?"
      subtitle="This helps us personalize your experience."
      primaryLabel="Continue"
      primaryDisabled={!selected}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
        {OPTIONS.map((option) => (
          <SelectableCard
            key={option.value}
            title={option.label}
            selected={selected === option.value}
            onPress={() => setSelected(option.value)}
          />
        ))}
        <View style={{ paddingTop: spacing.sm }}>
          <AppTextInput
            label="Pronouns (optional)"
            value={pronouns}
            onChangeText={setPronouns}
            placeholder="e.g. she/her, he/him, they/them"
            maxLength={40}
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}
