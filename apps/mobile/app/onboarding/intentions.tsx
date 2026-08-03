import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ChipGroup } from '../../src/components/ChipGroup';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { INTENTION_OPTIONS as OPTIONS } from '../../src/onboarding/options';
import { useOnboardingStore } from '../../src/store/onboarding';

export default function IntentionsScreen() {
  const { spacing } = useAppTheme();
  const storedIntentions = useOnboardingStore((state) => state.relationshipIntentions);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const [selected, setSelected] = useState<string[]>(storedIntentions);
  const [saving, setSaving] = useState(false);

  async function handlePrimary() {
    setSaving(true);
    try {
      await saveOnboarding({ relationshipIntentions: selected }, stepNumber('intentions'));
      router.push('/onboarding/name');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('intentions')}
      title="What are you looking for?"
      subtitle="Choose up to 3 — this can change anytime."
      primaryLabel="Continue"
      primaryDisabled={selected.length === 0}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <View style={{ paddingTop: spacing.sm }}>
        <ChipGroup options={OPTIONS} selected={selected} onChange={setSelected} max={3} />
      </View>
    </OnboardingScreen>
  );
}
