import { Camera01Icon, Shield01Icon, UserCheck01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';

interface Bullet {
  icon: IconSvgElement;
  text: string;
}

const BULLETS: Bullet[] = [
  { icon: Camera01Icon, text: 'Be yourself — real photos, real you.' },
  { icon: UserCheck01Icon, text: 'Treat every member with respect and kindness.' },
  { icon: Shield01Icon, text: 'We protect your data and never share your exact location.' }
];

export default function TermsScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const [agreed, setAgreed] = useState(false);

  return (
    <OnboardingScreen
      step={stepNumber('terms')}
      title="Terms & Privacy"
      subtitle="A quick summary before you join. The full details are always available in Settings."
      primaryLabel="Agree and continue"
      primaryDisabled={!agreed}
      onPrimaryPress={() => router.push('/onboarding/registration-method')}
    >
      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
        {BULLETS.map((bullet) => (
          <View
            key={bullet.text}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AppIcon icon={bullet.icon} color={colors.accent} size={18} />
            </View>
            <Text
              style={{
                flex: 1,
                color: colors.textPrimary,
                fontSize: typography.body.fontSize,
                lineHeight: typography.body.lineHeight
              }}
            >
              {bullet.text}
            </Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed((value) => !value)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            marginTop: spacing.sm,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: agreed ? colors.accent : colors.border,
            backgroundColor: agreed ? colors.surfaceAlt : colors.surface
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderColor: agreed ? colors.accent : colors.border,
              backgroundColor: agreed ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {agreed ? <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.onAccent }} /> : null}
          </View>
          <Text
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: typography.bodyMedium.fontSize,
              fontWeight: typography.bodyMedium.fontWeight
            }}
          >
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}
