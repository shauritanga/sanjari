import logo from '../../assets/icon.png';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { API_URL } from '../../src/config';
import { theme } from '../../src/theme/theme';
type ApiResponse = { message?: string; error?: { message?: string } };
async function readApiResponse(response: Response): Promise<ApiResponse> {
  return (await response.json()) as ApiResponse;
}
export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          dateOfBirth,
          confirmedAdult: true,
          acceptedTermsVersion: '2026-01',
          acceptedPrivacyVersion: '2026-01',
          locale: 'en',
        }),
      });
      const body = await readApiResponse(response);
      if (!response.ok)
        throw new Error(body.message ?? body.error?.message ?? 'Unable to create account.');
      router.push({ pathname: '/(auth)/verify-email', params: { email } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={logo} style={styles.logo} />
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.copy}>
          Sanjari is a private space for adults seeking meaningful connection.
        </Text>
        <AppTextInput label="Email" value={email} onChangeText={setEmail} />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <AppTextInput
          label="Date of birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          error={error}
        />
        <AppButton
          label={busy ? 'Creating...' : 'Create account'}
          onPress={() => {
            void submit();
          }}
        />
        <AppButton
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { flexGrow: 1, justifyContent: 'center', gap: theme.spacing.md },
  logo: { width: 96, height: 96, borderRadius: 24, alignSelf: 'center', marginBottom: theme.spacing.sm },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700', textAlign: 'center' },
  copy: { color: theme.colors.secondaryText, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
