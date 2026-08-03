import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { ChipGroup } from '../../src/components/ChipGroup';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';
import { INTEREST_OPTIONS } from '../../src/onboarding/options';

export default function InterestsScreen() {
  const storedInterests = useOnboardingStore((state) => state.interests);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);

  const [selected, setSelected] = useState<string[]>(storedInterests);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrimary() {
    if (selected.length < 5) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ interests: selected }, stepNumber('interests'));
      router.push('/onboarding/prompts');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your interests.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('interests')}
      title="What are you into?"
      subtitle="Pick at least 5 — great for icebreakers."
      primaryLabel="Continue"
      primaryDisabled={selected.length < 5}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      footerNote={error ?? `${selected.length} selected (min 5)`}
    >
      <ChipGroup options={INTEREST_OPTIONS} selected={selected} onChange={setSelected} max={20} />
    </OnboardingScreen>
  );
}
