import { ArrowLeft01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

const REPORT_REASONS = [
  { value: 'impersonation', label: 'Impersonation or fake profile' },
  { value: 'violence', label: 'Violence or disturbing content' },
  { value: 'underage_concern', label: 'Minor or underage' },
  { value: 'sexual_content', label: 'Nudity or sexually explicit content' },
  { value: 'privacy_violation', label: 'Privacy or personal information' },
] as const;

export default function ReportProfileScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { userId, displayName, mode } = useLocalSearchParams<{
    userId: string;
    displayName?: string;
    mode?: 'report' | 'block';
  }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!userId || !selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/reports', {
        reportedUserId: userId,
        category: selected,
        description: `Reported from profile view (${REPORT_REASONS.find((r) => r.value === selected)?.label ?? selected}).`,
      });
      if (mode === 'block') {
        await api.post(`/blocks/${userId}`, { reason: 'Reported and blocked from profile view.' });
        // Stack here is [..., profile, block, report] — pop all three to leave the blocked profile.
        router.back();
        router.back();
        router.back();
      } else {
        router.dismissTo(`/profile/${userId}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit this report.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.title}>Reason for report</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.dismissTo(`/profile/${userId}`)}
          hitSlop={12}
        >
          <AppIcon icon={Cancel01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {REPORT_REASONS.map((reason) => {
          const isSelected = selected === reason.value;
          return (
            <Pressable
              key={reason.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={reason.label}
              onPress={() => setSelected(reason.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: isSelected ? colors.textPrimary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.optionLabel}>{reason.label}</Text>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? colors.textPrimary : colors.border },
                ]}
              >
                {isSelected ? (
                  <View style={[styles.radioInner, { backgroundColor: colors.textPrimary }]} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          disabled={!selected || busy}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: selected ? colors.textPrimary : colors.border,
              opacity: busy ? 0.7 : pressed && selected ? 0.85 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={[
                styles.continueLabel,
                { color: selected ? colors.background : colors.textSecondary },
              ]}
            >
              Continue
            </Text>
          )}
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    list: { padding: spacing.lg, gap: spacing.md },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      minHeight: 56,
    },
    optionLabel: {
      fontSize: typography.bodyMedium.fontSize,
      fontWeight: '700',
      color: colors.textPrimary,
      flexShrink: 1,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: { width: 12, height: 12, borderRadius: radius.pill },
    error: {
      color: colors.error,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      marginTop: 'auto',
    },
    continueButton: {
      minHeight: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueLabel: { fontSize: typography.bodyMedium.fontSize, fontWeight: '700' },
    disclaimer: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
  });
}
