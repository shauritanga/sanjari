import { Location01Icon } from '@hugeicons/core-free-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

export default function LocationScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const cityName = useOnboardingStore((state) => state.cityName);
  const setApproximateLocationSet = useOnboardingStore((state) => state.setApproximateLocationSet);

  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnableLocation() {
    setRequesting(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location access was denied. You can enable it later from your device settings.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const wkt = `SRID=4326;POINT(${position.coords.longitude} ${position.coords.latitude})`;
      await api.post('/discovery/location', {
        protectedPointWkt: wkt,
        accuracyMeters: Math.round(position.coords.accuracy ?? 1000),
        approximateCity: cityName || undefined,
        source: 'onboarding'
      });
      setApproximateLocationSet(true);
      router.push('/onboarding/privacy');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to determine your location. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  function handleSkip() {
    router.push('/onboarding/privacy');
  }

  return (
    <OnboardingScreen
      step={stepNumber('location')}
      title="Enable location"
      subtitle="We use your approximate area to show nearby matches — your exact address is never shared."
      primaryLabel="Enable location"
      primaryLoading={requesting}
      onPrimaryPress={() => {
        void handleEnableLocation();
      }}
      secondaryLabel="Skip for now"
      onSecondaryPress={handleSkip}
      scroll={false}
    >
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
          <AppIcon icon={Location01Icon} color={colors.accent} size={56} />
        </View>
        {error ? (
          <Text style={[styles.error, { color: colors.error, fontSize: typography.body.fontSize, marginTop: spacing.lg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  error: { textAlign: 'center', lineHeight: 20 }
});
