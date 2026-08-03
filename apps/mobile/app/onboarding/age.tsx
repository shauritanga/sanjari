import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { pathForStep, stepNumber } from '../../src/onboarding/steps';

export default function AgeScreen() {
  const { colors, typography, spacing } = useAppTheme();

  return (
    <OnboardingScreen
      step={stepNumber('age')}
      hideBack
      title="You must be 18+"
      subtitle="Sanjari is an adults-only community. We verify your date of birth on the server, and it's never shown on your public profile — only your age."
      primaryLabel="I'm 18 or older"
      onPrimaryPress={() => router.push(pathForStep('terms'))}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight
          }}
        >
          You'll confirm your date of birth when you create your account. This keeps Sanjari safe for everyone.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
