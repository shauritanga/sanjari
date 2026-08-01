import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { AppButton } from '../src/components/AppButton';
import { api } from '../src/api';
import { theme } from '../src/theme/theme';
export default function SettingsScreen() {
  const [sessions, setSessions] = useState<Array<{ id: string; deviceId: string | null }>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void api
      .get<Array<{ id: string; deviceId: string | null }>>('/auth/sessions')
      .then((result) => setSessions(result.data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load sessions.'),
      );
  }, []);
  async function revoke(id: string) {
    await api.remove(`/auth/sessions/${id}`);
    setSessions((current) => current.filter((session) => session.id !== id));
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Your devices</Text>
        <Link href="/safety" style={styles.safetyLink}>
          Safety Centre
        </Link>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {sessions.map((session) => (
          <View key={session.id} style={styles.row}>
            <Text style={styles.device}>{session.deviceId ?? 'Unknown device'}</Text>
            <AppButton
              label="Sign out"
              variant="secondary"
              onPress={() => {
                void revoke(session.id);
              }}
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  safetyLink: { color: theme.colors.coral, fontSize: 16, fontWeight: '700' },
  row: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
  },
  device: { color: theme.colors.charcoal },
  error: { color: theme.colors.error },
});
