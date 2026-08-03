import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { API_URL } from '../../src/config';
import { theme } from '../../src/theme/theme';
type ApiResponse = { message?: string };
async function readApiResponse(response: Response): Promise<ApiResponse> {
  return (await response.json()) as ApiResponse;
}
export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    try {
      const response = await fetch(`${API_URL}/auth/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = await readApiResponse(response);
      if (!response.ok) throw new Error(body.message ?? 'Verification failed.');
      router.replace('/(auth)/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.copy}>Enter the six-digit code sent to {email}.</Text>
        <AppTextInput label="Verification code" value={code} onChangeText={setCode} error={error} />
        <AppButton
          label="Verify email"
          onPress={() => {
            void submit();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  copy: { color: theme.colors.secondaryText, fontSize: 16, lineHeight: 24 },
});
