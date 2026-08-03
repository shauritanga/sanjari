import { router } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../src/api';
import { useAppTheme } from '../src/theme/useAppTheme';
import { resumeOnboardingPath } from '../src/onboarding/steps';

export default function SplashScreen() {
  const { colors, typography, spacing } = useAppTheme();

  useEffect(() => {
    let cancelled = false;

    async function route() {
      const token = await SecureStore.getItemAsync('sanjari.accessToken');
      if (!token) {
        setTimeout(() => {
          if (!cancelled) router.replace('/onboarding/welcome');
        }, 800);
        return;
      }
      try {
        const onboarding = await api.get<{ onboardingStatus?: string; onboardingStep?: number }>('/onboarding');
        if (cancelled) return;
        if (onboarding.data?.onboardingStatus === 'published') {
          router.replace('/(tabs)/discover');
        } else {
          router.replace(resumeOnboardingPath(onboarding.data?.onboardingStep ?? 1));
        }
      } catch {
        if (!cancelled) router.replace('/onboarding/welcome');
      }
    }

    void route();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { gap: spacing.sm }]}>
        <Text
          style={[
            styles.brand,
            {
              color: colors.accentAlt,
              fontSize: typography.display.fontSize,
              lineHeight: typography.display.lineHeight,
              fontWeight: typography.display.fontWeight
            }
          ]}
        >
          Sanjari
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { letterSpacing: 0.5 }
});
