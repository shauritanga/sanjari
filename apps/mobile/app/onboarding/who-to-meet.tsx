import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ChipGroup } from '../../src/components/ChipGroup';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { WHO_TO_MEET_OPTIONS as OPTIONS } from '../../src/onboarding/options';
import { useOnboardingStore } from '../../src/store/onboarding';

export default function WhoToMeetScreen() {
  const { spacing } = useAppTheme();
  const storedInterestedIn = useOnboardingStore((state) => state.interestedIn);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const setDiscoveryPreference = useOnboardingStore((state) => state.setDiscoveryPreference);
  const [selected, setSelected] = useState<string[]>(storedInterestedIn);
  const [saving, setSaving] = useState(false);

  async function handlePrimary() {
    setSaving(true);
    try {
      // "Everyone" (or nothing specific) means no gender filter; otherwise
      // restrict Discover to the selected genders.
      const genders = selected.includes('everyone') ? [] : selected;
      await Promise.all([
        saveOnboarding({ interestedIn: selected }, stepNumber('who-to-meet')),
        setDiscoveryPreference({ genders }),
      ]);
      router.push('/onboarding/intentions');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('who-to-meet')}
      title="Who do you want to meet?"
      subtitle="Select all that apply."
      primaryLabel="Continue"
      primaryDisabled={selected.length === 0}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <View style={{ paddingTop: spacing.sm }}>
        <ChipGroup options={OPTIONS} selected={selected} onChange={setSelected} />
      </View>
    </OnboardingScreen>
  );
}
