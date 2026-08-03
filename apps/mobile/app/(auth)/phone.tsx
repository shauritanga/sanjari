import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';
import { resumeOnboardingPath } from '../../src/onboarding/steps';

export default function PhoneAuthScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');
  async function requestCode() {
    try {
      await api.post('/auth/phone/login/request', { phoneNumber });
      setRequested(true);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send code.');
    }
  }
  async function verifyCode() {
    try {
      const result = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/phone/login/verify',
        { phoneNumber, code, deviceId: 'mobile-phone-device' },
      );
      const tokens = result.data;
      if (!tokens) throw new Error('Login response was incomplete.');
      await import('expo-secure-store').then(async ({ setItemAsync }) => {
        await setItemAsync('sanjari.accessToken', tokens.accessToken);
        await setItemAsync('sanjari.refreshToken', tokens.refreshToken);
      });
      const onboarding = await api.get<{ onboardingStatus?: string; onboardingStep?: number }>('/onboarding');
      if (onboarding.data?.onboardingStatus === 'published') {
        router.replace('/(tabs)/discover');
      } else {
        router.replace(resumeOnboardingPath(onboarding.data?.onboardingStep ?? 1));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify code.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Use your phone</Text>
        <Text style={styles.copy}>Enter your number in international format.</Text>
        <AppTextInput
          label="Phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          {...(!requested && error ? { error } : {})}
        />
        <AppButton
          label="Send code"
          onPress={() => {
            void requestCode();
          }}
        />
        {requested ? (
          <>
            <AppTextInput
              label="Verification code"
              value={code}
              onChangeText={setCode}
              error={error}
            />
            <AppButton
              label="Verify and log in"
              onPress={() => {
                void verifyCode();
              }}
            />
          </>
        ) : null}
        <AppButton
          label="Back to email login"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  copy: { color: theme.colors.secondaryText, fontSize: 16 },
});
