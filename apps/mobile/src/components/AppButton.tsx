import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme/theme';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function AppButton({ label, onPress, icon, variant = 'primary' }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, variant === 'secondary' && styles.secondary]}
    >
      {icon}
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg
  },
  secondary: {
    backgroundColor: theme.colors.softRose
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
  },
  secondaryLabel: {
    color: theme.colors.deepPlum
  }
});
