import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';
export default function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  async function submit() {
    try {
      await api.post('/auth/password-reset/request', { email });
      setMessage('If the account exists, reset instructions have been sent.');
    } catch {
      setMessage('If the account exists, reset instructions have been sent.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.copy}>We will send instructions if the account exists.</Text>
        <AppTextInput label="Email" value={email} onChangeText={setEmail} error={message} />
        <AppButton
          label="Send reset instructions"
          onPress={() => {
            void submit();
          }}
        />
        <AppButton
          label="Back to login"
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
