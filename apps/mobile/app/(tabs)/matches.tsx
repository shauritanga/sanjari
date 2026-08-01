import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';

type Match = {
  id: string;
  conversationId: string | null;
  user: { id: string; profile: { displayName: string | null; city: string | null } | null };
};

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void api
      .get<Match[]>('/matches')
      .then((result) => setMatches(result.data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load matches.'),
      );
  }, []);
  async function block(userId: string) {
    try {
      await api.post(`/blocks/${userId}`, { reason: 'Blocked from matches.' });
      setMatches((current) => current.filter((match) => match.user.id !== userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to block this member.');
    }
  }
  async function report(userId: string) {
    try {
      await api.post('/reports', {
        reportedUserId: userId,
        category: 'other',
        description: 'Reported from matches.',
      });
      setError('Report submitted for review.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit report.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Matches</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {matches.length === 0 ? (
          <Text style={styles.copy}>Your mutual matches will appear here.</Text>
        ) : null}
        {matches.map((match) => (
          <View key={match.id} style={styles.card}>
            <Text style={styles.name}>{match.user.profile?.displayName ?? 'Sanjari member'}</Text>
            <Text style={styles.city}>{match.user.profile?.city ?? 'Location not shared'}</Text>
            <View style={styles.actions}>
              <AppButton
                label="Block"
                variant="secondary"
                onPress={() => void block(match.user.id)}
              />
              <AppButton
                label="Report"
                variant="secondary"
                onPress={() => {
                  Alert.alert('Report match', 'Submit this match for safety review?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Report', onPress: () => void report(match.user.id) },
                  ]);
                }}
              />
            </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  name: { color: theme.colors.deepPlum, fontSize: 20, fontWeight: '700' },
  city: { color: theme.colors.secondaryText },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  copy: { color: theme.colors.secondaryText },
  error: { color: theme.colors.error },
});
