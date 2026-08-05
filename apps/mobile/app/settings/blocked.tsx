import { ArrowLeft01Icon, UserBlock02Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';

interface BlockedProfile {
  id: string;
  blockedId: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export default function BlockedProfilesScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const [blocked, setBlocked] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<BlockedProfile[]>('/blocks')
      .then((result) => setBlocked(result.data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load blocked profiles.'))
      .finally(() => setLoading(false));
  }, []);

  async function unblock(blockedId: string) {
    setUnblockingId(blockedId);
    try {
      await api.remove(`/blocks/${blockedId}`);
      setBlocked((current) => current.filter((item) => item.blockedId !== blockedId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to unblock this profile.');
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Blocked profiles</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
          {error ? <Text style={{ color: colors.error, fontWeight: '600' }}>{error}</Text> : null}
          {blocked.length === 0 ? (
            <View style={styles.centeredEmpty}>
              <AppIcon icon={UserBlock02Icon} color={colors.textSecondary} size={32} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>You haven't blocked anyone.</Text>
            </View>
          ) : (
            blocked.map((item) => (
              <View
                key={item.id}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md }]}
              >
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={[styles.avatar, { borderRadius: radius.pill }]} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
                    <AppIcon icon={UserBlock02Icon} color={colors.textSecondary} size={18} />
                  </View>
                )}
                <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                  {item.displayName ?? 'Sanjari member'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void unblock(item.blockedId)}
                  disabled={unblockingId === item.blockedId}
                  hitSlop={8}
                >
                  {unblockingId === item.blockedId ? (
                    <ActivityIndicator color={colors.accentAlt} size="small" />
                  ) : (
                    <Text style={{ color: colors.accentAlt, fontWeight: '700' }}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centeredEmpty: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 64 },
  content: { paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  avatar: { width: 40, height: 40 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
});
