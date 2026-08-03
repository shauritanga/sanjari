import { Notification03Icon } from '@hugeicons/core-free-icons';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

export default function NotificationsScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const setNotificationsEnabled = useOnboardingStore((state) => state.setNotificationsEnabled);

  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setRequesting(true);
    setError(null);
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Notifications were not enabled. You can turn them on later in settings.');
        setRequesting(false);
        return;
      }
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        const token = tokenResponse?.data;
        if (token && token.length >= 16) {
          await api.post('/notifications/push-token', {
            token,
            provider: Platform.OS === 'ios' ? 'ios' : 'android'
          });
        }
      } catch {
        // Push token registration can fail in Expo Go / simulators without a projectId; permission grant still counts.
      }
      setNotificationsEnabled(true);
      router.push('/onboarding/voice-intro');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to enable notifications right now.');
    } finally {
      setRequesting(false);
    }
  }

  function handleSkip() {
    router.push('/onboarding/voice-intro');
  }

  return (
    <OnboardingScreen
      step={stepNumber('notifications')}
      title="Stay in the loop"
      subtitle="Get notified about new matches and messages."
      primaryLabel="Enable notifications"
      primaryLoading={requesting}
      onPrimaryPress={() => {
        void handleEnable();
      }}
      secondaryLabel="Not now"
      onSecondaryPress={handleSkip}
      scroll={false}
    >
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
          <AppIcon icon={Notification03Icon} color={colors.accent} size={56} />
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
