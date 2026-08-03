import { FavouriteIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function OnboardingWelcomeScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, gap: spacing.lg }]}>
        <View
          style={[
            styles.mark,
            { backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, width: 88, height: 88 }
          ]}
        >
          <AppIcon icon={FavouriteIcon} color={colors.accent} size={40} />
        </View>

        <View style={{ gap: spacing.sm }}>
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
          <Text
            style={[
              styles.tagline,
              {
                color: colors.textSecondary,
                fontSize: typography.bodyLarge.fontSize,
                lineHeight: typography.bodyLarge.lineHeight
              }
            ]}
          >
            Real people, real connections. Meet someone worth the swipe — thoughtfully matched, safely verified.
          </Text>
        </View>
      </View>

      <View style={[styles.actions, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }]}>
        <AppButton label="Get started" onPress={() => router.push('/onboarding/age')} />
        <AppButton
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center' },
  brand: { letterSpacing: 0.5 },
  tagline: { maxWidth: 320 },
  actions: {}
});
