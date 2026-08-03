import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { ChipGroup } from '../../src/components/ChipGroup';
import { Stepper } from '../../src/components/Stepper';
import { ToggleRow } from '../../src/components/ToggleRow';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Nonbinary' },
  { value: 'everyone', label: 'Everyone' }
];

const INTENTION_OPTIONS = [
  { value: 'long_term', label: 'Long-term relationship' },
  { value: 'short_term', label: 'Short-term fun' },
  { value: 'casual', label: 'Casual dating' },
  { value: 'friendship', label: 'New friends' },
  { value: 'not_sure', label: 'Still figuring it out' }
];

export default function DiscoveryPreferencesScreen() {
  const { spacing } = useAppTheme();
  const preference = useOnboardingStore((state) => state.discoveryPreference);
  const setDiscoveryPreference = useOnboardingStore((state) => state.setDiscoveryPreference);

  const [minAge, setMinAge] = useState(preference.minAge);
  const [maxAge, setMaxAge] = useState(preference.maxAge);
  const [maxDistanceKm, setMaxDistanceKm] = useState(preference.maxDistanceKm);
  const [genders, setGenders] = useState<string[]>(preference.genders);
  const [intentions, setIntentions] = useState<string[]>(preference.intentions);
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
      await setDiscoveryPreference({ minAge, maxAge, maxDistanceKm, genders, intentions, showDistance });
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
      subtitle="You can change these anytime in settings."
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
      <View style={{ gap: spacing.sm }}>
        <ChipGroup options={GENDER_OPTIONS} selected={genders} onChange={setGenders} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <ChipGroup options={INTENTION_OPTIONS} selected={intentions} onChange={setIntentions} max={5} />
      </View>
      <ToggleRow
        title="Show my distance to others"
        value={showDistance}
        onChange={setShowDistance}
      />
    </OnboardingScreen>
  );
}
