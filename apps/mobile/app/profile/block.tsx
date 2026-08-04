import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

function initialsFor(name: string | null | undefined) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function BlockProfileScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { userId, displayName, photoUrl } = useLocalSearchParams<{
    userId: string;
    displayName?: string;
    photoUrl?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = displayName || 'this member';

  async function block() {
    if (!userId || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/blocks/${userId}`, { reason: 'Blocked from profile view.' });
      router.back();
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to block this member.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeButton}
        >
          <AppIcon icon={Cancel01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>{initialsFor(displayName)}</Text>
          </View>
        )}

        <Text style={styles.title}>Block {name}</Text>
        <Text style={styles.subtitle}>
          Don&apos;t worry, {name} won&apos;t know that you&apos;ve reported and blocked them.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Block"
          disabled={busy}
          onPress={() => void block()}
          style={({ pressed }) => [
            styles.blockButton,
            { opacity: busy ? 0.7 : pressed ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.blockButtonLabel}>Block</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report and block"
          disabled={busy}
          onPress={() =>
            router.push({
              pathname: '/profile/report',
              params: { userId, displayName: name, mode: 'block' },
            })
          }
          style={({ pressed }) => [styles.reportBlockButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={styles.reportBlockLabel}>Report and Block</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Intentional false reporting will result in your account being suspended.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    avatar: { width: 120, height: 120, borderRadius: radius.pill, marginBottom: spacing.sm },
    avatarPlaceholder: {
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: { fontSize: 40, fontWeight: '800', color: colors.accentAlt },
    title: {
      fontSize: typography.h2.fontSize,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    error: { color: colors.error, fontWeight: '600', textAlign: 'center' },
    footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
    blockButton: {
      minHeight: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockButtonLabel: {
      color: colors.background,
      fontSize: typography.bodyMedium.fontSize,
      fontWeight: '700',
    },
    reportBlockButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    reportBlockLabel: {
      color: colors.textPrimary,
      fontSize: typography.bodyMedium.fontSize,
      fontWeight: '700',
    },
    disclaimer: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
  });
}
