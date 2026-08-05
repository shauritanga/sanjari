import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { API_URL } from '../../src/config';
import { getDeviceId } from '../../src/lib/deviceId';
import { theme } from '../../src/theme/theme';
import { resumeOnboardingPath } from '../../src/onboarding/steps';
type ApiResponse = {
  data?: { accessToken?: string; refreshToken?: string };
  message?: string;
  error?: { message?: string };
};
async function readApiResponse(response: Response): Promise<ApiResponse> {
  return (await response.json()) as ApiResponse;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const deviceId = await getDeviceId();
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
      });
      const body = await readApiResponse(response);
      if (!response.ok) throw new Error(body.message ?? body.error?.message ?? 'Unable to log in.');
      if (!body.data?.accessToken || !body.data.refreshToken)
        throw new Error('Login response was incomplete.');
      await SecureStore.setItemAsync('sanjari.accessToken', body.data.accessToken);
      await SecureStore.setItemAsync('sanjari.refreshToken', body.data.refreshToken);
      const onboarding = await fetch(`${API_URL}/onboarding`, {
        headers: { Authorization: `Bearer ${body.data.accessToken}` },
      });
      const onboardingBody = (await onboarding.json()) as {
        data?: { onboardingStatus?: string; onboardingStep?: number };
      };
      if (onboardingBody.data?.onboardingStatus === 'published') {
        router.replace('/(tabs)/discover');
      } else {
        router.replace(resumeOnboardingPath(onboardingBody.data?.onboardingStep ?? 1));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.copy}>Log in to continue your journey.</Text>
        <AppTextInput label="Email" value={email} onChangeText={setEmail} />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={error}
        />
        <AppButton
          label={busy ? 'Logging in...' : 'Log in'}
          onPress={() => {
            void submit();
          }}
        />
        <AppButton
          label="Create an account"
          variant="secondary"
          onPress={() => router.push('/(auth)/signup')}
        />
        <AppButton
          label="Log in with phone"
          variant="secondary"
          onPress={() => router.push('/(auth)/phone')}
        />
        <AppButton
          label="Forgot password?"
          variant="secondary"
          onPress={() => router.push('/(auth)/password-reset')}
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
