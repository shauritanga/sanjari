import { PartyIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { useOnboardingStore } from '../../src/store/onboarding';

export default function BirthdayScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const age = useOnboardingStore((state) => state.age);
  const hydrate = useOnboardingStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <OnboardingScreen
      step={stepNumber('birthday')}
      title="Confirmed"
      subtitle="Your age is verified and will never be shown publicly — only your age range appears on your profile."
      primaryLabel="Continue"
      onPrimaryPress={() => router.push('/onboarding/gender')}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          paddingVertical: spacing.xl,
          borderRadius: radius.xl,
          backgroundColor: colors.surfaceAlt
        }}
      >
        <AppIcon icon={PartyIcon} color={colors.accent} size={36} />
        <Text
          style={{
            color: colors.accentAlt,
            fontSize: 64,
            lineHeight: 70,
            fontWeight: typography.display.fontWeight
          }}
        >
          {age ?? '--'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.bodyMedium.fontSize,
            fontWeight: typography.bodyMedium.fontWeight
          }}
        >
          You're {age ?? '--'} years old
        </Text>
      </View>
    </OnboardingScreen>
  );
}
