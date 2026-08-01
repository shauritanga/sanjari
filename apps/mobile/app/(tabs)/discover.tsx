import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';

type Candidate = {
  id: string;
  displayName: string | null;
  age: number;
  city: string | null;
  distanceCategory: string;
  score: number;
  explanation: { components: Record<string, number> };
};

export default function DiscoverScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    void api
      .get<Candidate[]>('/discovery')
      .then((result) => {
        const values = result.data ?? [];
        setCandidates(values);
        setEmpty(values.length === 0);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load discovery.'),
      );
  }, []);
  async function act(candidateId: string, action: 'like' | 'pass') {
    try {
      await api.post(`/discovery/${candidateId}/${action}`, {
        idempotencyKey: `${candidateId}-${Date.now()}`,
      });
      setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update discovery.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Discover</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {empty ? (
          <Text style={styles.copy}>There are no new profiles right now. Check back later.</Text>
        ) : (
          candidates.map((candidate) => (
            <View key={candidate.id} style={styles.card}>
              <Text style={styles.name}>
                {candidate.displayName ?? 'Sanjari member'}, {candidate.age}
              </Text>
              <Text style={styles.meta}>
                {candidate.city ?? 'Location not shared'} ·{' '}
                {candidate.distanceCategory.replace('_', ' ')}
              </Text>
              <Text style={styles.explanation}>
                Compatibility {candidate.score}% based on shared preferences and profile
                completeness.
              </Text>
              <View style={styles.actions}>
                <AppButton
                  label="Pass"
                  variant="secondary"
                  onPress={() => {
                    void act(candidate.id, 'pass');
                  }}
                />
                <AppButton
                  label="Like"
                  onPress={() => {
                    void act(candidate.id, 'like');
                  }}
                />
              </View>
            </View>
          ))
        )}
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
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  name: { color: theme.colors.deepPlum, fontSize: 24, fontWeight: '700' },
  meta: { color: theme.colors.secondaryText },
  explanation: { color: theme.colors.charcoal, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  copy: { color: theme.colors.secondaryText },
  error: { color: theme.colors.error },
});
