import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { Stepper } from '../../src/components/Stepper';
import { ToggleRow } from '../../src/components/ToggleRow';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

export default function DiscoveryPreferencesScreen() {
  const { spacing } = useAppTheme();
  const preference = useOnboardingStore((state) => state.discoveryPreference);
  const setDiscoveryPreference = useOnboardingStore((state) => state.setDiscoveryPreference);

  const [minAge, setMinAge] = useState(preference.minAge);
  const [maxAge, setMaxAge] = useState(preference.maxAge);
  const [maxDistanceKm, setMaxDistanceKm] = useState(preference.maxDistanceKm);
  const [showDistance, setShowDistance] = useState(preference.showDistance);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMinAge(value: number) {
    setMinAge(value);
    if (value > maxAge) setMaxAge(value);
  }

  function changeMaxAge(value: number) {
    setMaxAge(value);
    if (value < minAge) setMinAge(value);
  }

  async function handlePrimary() {
    setSaving(true);
    setError(null);
    try {
      await setDiscoveryPreference({ minAge, maxAge, maxDistanceKm, showDistance });
      router.push('/onboarding/location');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('discovery-preferences')}
      title="Your match preferences"
      subtitle="Who you want to meet is already set — just fine-tune age range and distance."
      primaryLabel="Continue"
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      {...(error ? { footerNote: error } : {})}
    >
      <View style={{ gap: spacing.sm }}>
        <Stepper label="Minimum age" value={minAge} min={18} max={99} onChange={changeMinAge} />
        <Stepper label="Maximum age" value={maxAge} min={18} max={100} onChange={changeMaxAge} />
        <Stepper
          label="Maximum distance"
          value={maxDistanceKm}
          min={1}
          max={500}
          step={5}
          suffix="km"
          onChange={setMaxDistanceKm}
        />
      </View>
      <ToggleRow
        title="Show my distance to others"
        value={showDistance}
        onChange={setShowDistance}
      />
    </OnboardingScreen>
  );
}
