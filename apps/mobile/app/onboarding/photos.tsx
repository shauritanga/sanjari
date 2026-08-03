import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { PhotoGrid } from '../../src/components/PhotoGrid';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { useOnboardingStore } from '../../src/store/onboarding';

export default function PhotosScreen() {
  const { spacing } = useAppTheme();
  const photos = useOnboardingStore((state) => state.photos);
  const setPhotos = useOnboardingStore((state) => state.setPhotos);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const [saving, setSaving] = useState(false);

  async function handlePrimary() {
    setSaving(true);
    try {
      await saveOnboarding({}, stepNumber('photos'));
      router.push('/onboarding/country');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('photos')}
      title="Add your photos"
      subtitle="Add at least 2 photos. Your first photo is your main photo."
      primaryLabel="Continue"
      primaryDisabled={photos.length < 2}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <View style={{ paddingTop: spacing.sm }}>
        <PhotoGrid photos={photos} onChange={setPhotos} slots={6} />
      </View>
    </OnboardingScreen>
  );
}
