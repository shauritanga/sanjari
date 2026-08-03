import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { ChipGroup } from '../../src/components/ChipGroup';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';
import { LANGUAGE_OPTIONS } from '../../src/onboarding/options';

export default function LanguagesScreen() {
  const storedLanguages = useOnboardingStore((state) => state.languages);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);

  const [selected, setSelected] = useState<string[]>(storedLanguages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrimary() {
    if (selected.length < 1) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ languages: selected }, stepNumber('languages'));
      router.push('/onboarding/discovery-preferences');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your languages.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('languages')}
      title="What languages do you speak?"
      subtitle="Pick up to 10."
      primaryLabel="Continue"
      primaryDisabled={selected.length < 1}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      {...(error ? { footerNote: error } : {})}
    >
      <ChipGroup options={LANGUAGE_OPTIONS} selected={selected} onChange={setSelected} max={10} />
    </OnboardingScreen>
  );
}
