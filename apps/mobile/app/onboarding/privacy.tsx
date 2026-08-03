import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { ToggleRow } from '../../src/components/ToggleRow';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

export default function PrivacyScreen() {
  const { spacing } = useAppTheme();
  const hideAgeStored = useOnboardingStore((state) => state.hideAge);
  const hideOnlineStatusStored = useOnboardingStore((state) => state.hideOnlineStatus);
  const hideReadReceiptsStored = useOnboardingStore((state) => state.hideReadReceipts);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);

  const [hideAge, setHideAge] = useState(hideAgeStored);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(hideOnlineStatusStored);
  const [hideReadReceipts, setHideReadReceipts] = useState(hideReadReceiptsStored);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrimary() {
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ hideAge, hideOnlineStatus, hideReadReceipts }, stepNumber('privacy'));
      router.push('/onboarding/verification');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your privacy settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('privacy')}
      title="Privacy controls"
      subtitle="Fine-tune what others can see."
      primaryLabel="Continue"
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      {...(error ? { footerNote: error } : {})}
    >
      <View style={{ gap: spacing.md }}>
        <ToggleRow
          title="Hide my age"
          description="Only your age range will show"
          value={hideAge}
          onChange={setHideAge}
        />
        <ToggleRow
          title="Hide online status"
          description="Others won't see when you're active"
          value={hideOnlineStatus}
          onChange={setHideOnlineStatus}
        />
        <ToggleRow
          title="Hide read receipts"
          description="Others won't know when you've read their messages"
          value={hideReadReceipts}
          onChange={setHideReadReceipts}
        />
      </View>
    </OnboardingScreen>
  );
}
