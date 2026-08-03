import { MailAtSign01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectableCard } from '../../src/components/SelectableCard';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';

type Method = 'email' | 'phone';

export default function RegistrationMethodScreen() {
  const { colors, spacing } = useAppTheme();
  const [selected, setSelected] = useState<Method>('email');

  function goTo(method: Method) {
    router.push(method === 'email' ? '/(auth)/signup' : '/(auth)/phone');
  }

  return (
    <OnboardingScreen
      step={stepNumber('registration-method')}
      title="Create your account"
      subtitle="Choose how you'd like to sign up."
      primaryLabel="Continue"
      onPrimaryPress={() => goTo(selected)}
    >
      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
        <SelectableCard
          title="Continue with email"
          description="We'll send you a verification link."
          icon={<AppIcon icon={MailAtSign01Icon} color={colors.accent} size={22} />}
          selected={selected === 'email'}
          onPress={() => {
            setSelected('email');
            goTo('email');
          }}
        />
        <SelectableCard
          title="Continue with phone"
          description="We'll text you a one-time code."
          icon={<AppIcon icon={SmartPhone01Icon} color={colors.accent} size={22} />}
          selected={selected === 'phone'}
          onPress={() => {
            setSelected('phone');
            goTo('phone');
          }}
        />
      </View>
    </OnboardingScreen>
  );
}
