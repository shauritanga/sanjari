import { RocketIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';

export default function PublishScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      await api.post('/onboarding/publish', {});
      router.replace('/(tabs)/discover');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to publish your profile. Please try again.');
      setPublishing(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('publish')}
      title="You're all set!"
      subtitle="Publish your profile and start discovering matches."
      primaryLabel="Publish my profile"
      primaryLoading={publishing}
      onPrimaryPress={() => {
        void handlePublish();
      }}
      hideBack
      {...(error ? { footerNote: error } : {})}
      scroll={false}
    >
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
          <AppIcon icon={RocketIcon} color={colors.accent} size={56} />
        </View>
        <Text style={[styles.copy, { color: colors.textSecondary, fontSize: typography.bodyLarge.fontSize, marginTop: spacing.lg }]}>
          Your profile is ready to shine. Once published, people nearby will start seeing you in their discovery feed.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  copy: { textAlign: 'center', lineHeight: 24 }
});
