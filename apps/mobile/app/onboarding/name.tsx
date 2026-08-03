import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppTextInput } from '../../src/components/AppTextInput';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { useOnboardingStore } from '../../src/store/onboarding';

export default function NameScreen() {
  const { spacing } = useAppTheme();
  const storedName = useOnboardingStore((state) => state.displayName);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const [value, setValue] = useState(storedName);
  const [saving, setSaving] = useState(false);

  async function handlePrimary() {
    setSaving(true);
    try {
      await saveOnboarding({ displayName: value.trim() }, stepNumber('name'));
      router.push('/onboarding/photos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('name')}
      title="What's your name?"
      subtitle="This is how you'll appear to others."
      primaryLabel="Continue"
      primaryDisabled={value.trim().length < 2}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <View style={{ paddingTop: spacing.sm }}>
        <AppTextInput label="First name" value={value} onChangeText={setValue} maxLength={60} autoCapitalize="words" />
      </View>
    </OnboardingScreen>
  );
}
