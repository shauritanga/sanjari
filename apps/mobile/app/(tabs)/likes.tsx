import { CheckmarkBadge01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface LikeReceived {
  likeId: string;
  userId: string;
  comment: string | null;
  priority: boolean;
  createdAt: string;
  displayName: string | null;
  city: string | null;
  verificationStatus: string;
  primaryPhoto: { id: string; url: string } | null;
}

interface LikeResult {
  liked: true;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  likeId: string;
  matchedUser?: { id: string; displayName: string | null; primaryPhoto: { id: string; url: string } | null };
}

function initialsFor(name: string | null) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function LikesScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const [likes, setLikes] = useState<LikeReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    void api
      .get<LikeReceived[]>('/discovery/likes-received')
      .then((result) => setLikes(result.data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load likes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function likeBack(item: LikeReceived) {
    setBusyId(item.userId);
    setError('');
    try {
      const result = await api.post<LikeResult>(`/discovery/${item.userId}/like`, {
        priority: false,
        idempotencyKey: `${item.userId}-${Date.now()}`,
      });
      setLikes((current) => current.filter((entry) => entry.userId !== item.userId));
      if (result.data?.matched) {
        router.push({
          pathname: '/match-celebration',
          params: {
            matchId: result.data.matchId ?? '',
            conversationId: result.data.conversationId ?? '',
            displayName: result.data.matchedUser?.displayName ?? item.displayName ?? '',
            photoId: result.data.matchedUser?.primaryPhoto?.id ?? item.primaryPhoto?.id ?? '',
          },
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to like this member back.');
    } finally {
      setBusyId(null);
    }
  }

  async function pass(item: LikeReceived) {
    setBusyId(item.userId);
    setError('');
    try {
      await api.post(`/discovery/${item.userId}/pass`, {
        idempotencyKey: `${item.userId}-${Date.now()}`,
      });
      setLikes((current) => current.filter((entry) => entry.userId !== item.userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to pass on this member.');
    } finally {
      setBusyId(null);
    }
  }

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Likes</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {likes.length === 0 && !error ? (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No one has liked you yet</Text>
              <Text style={styles.emptyCopy}>Keep discovering — your next admirer could be just a swipe away.</Text>
            </View>
          ) : (
            likes.map((item) => (
              <View key={item.likeId} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/profile/${item.userId}`)}
                  style={({ pressed }) => [styles.cardTouchable, { opacity: pressed ? 0.85 : 1 }]}
                >
                  {item.primaryPhoto ? (
                    <Image source={{ uri: item.primaryPhoto.url }} style={styles.photo} contentFit="cover" transition={150} />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <Text style={styles.initials}>{initialsFor(item.displayName)}</Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.displayName ?? 'Sanjari member'}
                      </Text>
                      {item.verificationStatus === 'verified' ? (
                        <AppIcon icon={CheckmarkBadge01Icon} color={colors.accent} size={18} />
                      ) : null}
                    </View>
                    {item.city ? <Text style={styles.city}>{item.city}</Text> : null}
                    {item.priority ? (
                      <View style={styles.superLikeRow}>
                        <AppIcon icon={StarIcon} color={colors.gold} size={14} />
                        <Text style={styles.superLikeLabel}>Super Like</Text>
                      </View>
                    ) : null}
                    {item.comment ? <Text style={styles.comment}>&ldquo;{item.comment}&rdquo;</Text> : null}
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  <AppButton
                    label="Pass"
                    variant="secondary"
                    disabled={busyId === item.userId}
                    onPress={() => {
                      void pass(item);
                    }}
                  />
                  <AppButton
                    label="Like back"
                    loading={busyId === item.userId}
                    onPress={() => {
                      void likeBack(item);
                    }}
                  />
                </View>
              </View>
            ))
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
    emptyTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    emptyCopy: {
      fontSize: typography.body.fontSize,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    error: { color: colors.error, marginBottom: spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardTouchable: { gap: spacing.sm },
    photo: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
    photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 40, fontWeight: '800', color: colors.accentAlt },
    cardBody: { gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
    city: { fontSize: typography.body.fontSize, color: colors.textSecondary },
    superLikeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    superLikeLabel: { fontSize: typography.caption.fontSize, fontWeight: '700', color: colors.gold },
    comment: { fontSize: typography.body.fontSize, color: colors.textPrimary, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: spacing.sm },
  });
}
