import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface Match {
  id: string;
  createdAt: string;
  conversationId: string | null;
  user: { id: string; profile: { displayName: string | null; city: string | null } | null };
}

const NEW_MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

export default function MatchesScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    void api
      .get<Match[]>('/matches')
      .then((result) => setMatches(result.data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load matches.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unmatch(match: Match) {
    setBusyId(match.id);
    setError('');
    try {
      await api.post(`/matches/${match.id}/unmatch`, { reason: 'User initiated unmatch.' });
      setMatches((current) => current.filter((entry) => entry.id !== match.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to unmatch.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmUnmatch(match: Match) {
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${match.user.profile?.displayName ?? 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: () => void unmatch(match) },
      ],
    );
  }

  async function block(match: Match) {
    setBusyId(match.id);
    setError('');
    try {
      await api.post(`/blocks/${match.user.id}`, { reason: 'Blocked from matches.' });
      setMatches((current) => current.filter((entry) => entry.id !== match.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to block this member.');
    } finally {
      setBusyId(null);
    }
  }

  async function report(match: Match) {
    setError('');
    try {
      await api.post('/reports', {
        reportedUserId: match.user.id,
        category: 'other',
        description: 'Reported from matches.',
      });
      setError('Report submitted for review.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit report.');
    }
  }

  function confirmReport(match: Match) {
    Alert.alert('Report match', 'Submit this match for safety review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', onPress: () => void report(match) },
    ]);
  }

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {matches.length === 0 && !error ? (
            <View style={styles.centered}>
              <Text style={styles.emptyCopy}>Your mutual matches will appear here.</Text>
            </View>
          ) : (
            matches.map((match) => {
              const isNew = Date.now() - new Date(match.createdAt).getTime() < NEW_MATCH_WINDOW_MS;
              const canOpen = Boolean(match.conversationId);
              return (
                <View key={match.id} style={styles.card}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canOpen}
                    onPress={() => {
                      if (!match.conversationId) return;
                      router.push({ pathname: '/conversation/[id]', params: { id: match.conversationId } });
                    }}
                    style={({ pressed }) => [styles.cardTouchable, { opacity: pressed && canOpen ? 0.85 : 1 }]}
                  >
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{match.user.profile?.displayName ?? 'Sanjari member'}</Text>
                      {isNew ? (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeLabel}>New</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.city}>{match.user.profile?.city ?? 'Location not shared'}</Text>
                    {!canOpen ? <Text style={styles.disabledHint}>Conversation is still being set up.</Text> : null}
                  </Pressable>
                  <View style={styles.actions}>
                    <AppButton
                      label="Unmatch"
                      variant="secondary"
                      disabled={busyId === match.id}
                      onPress={() => confirmUnmatch(match)}
                    />
                    <AppButton
                      label="Block"
                      variant="secondary"
                      disabled={busyId === match.id}
                      onPress={() => {
                        void block(match);
                      }}
                    />
                    <AppButton label="Report" variant="secondary" onPress={() => confirmReport(match)} />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
    title: { fontSize: typography.h1.fontSize, fontWeight: '800', color: colors.textPrimary },
    content: { padding: spacing.lg, gap: spacing.md },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
    emptyCopy: { fontSize: typography.body.fontSize, color: colors.textSecondary, textAlign: 'center' },
    error: { color: colors.error, marginBottom: spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardTouchable: { gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    city: { fontSize: typography.body.fontSize, color: colors.textSecondary },
    disabledHint: { fontSize: typography.caption.fontSize, color: colors.textSecondary, fontStyle: 'italic' },
    newBadge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    newBadgeLabel: { fontSize: typography.micro.fontSize, fontWeight: '700', color: colors.onAccent },
    actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  });
}
