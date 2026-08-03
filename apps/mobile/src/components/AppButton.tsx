import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function AppButton({ label, onPress, icon, variant = 'primary', disabled, loading }: AppButtonProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const labelColor = variant === 'primary' ? colors.onAccent : colors.accentAlt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radius.md,
          backgroundColor: background,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border
        }
      ]}
    >
      {loading ? <ActivityIndicator color={labelColor} /> : icon}
      {!loading ? (
        <Text style={[styles.label, { color: labelColor, fontSize: typography.bodyMedium.fontSize }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  label: {
    fontWeight: '700'
  }
});
