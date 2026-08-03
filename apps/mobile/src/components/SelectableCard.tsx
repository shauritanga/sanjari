import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from './AppIcon';
import { useAppTheme } from '../theme/useAppTheme';

interface SelectableCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
}

export function SelectableCard({ title, description, icon, selected, onPress }: SelectableCardProps) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderRadius: radius.lg,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.surfaceAlt : colors.surface,
          padding: spacing.md,
          gap: spacing.sm
        }
      ]}
    >
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      {selected ? <AppIcon icon={Tick02Icon} color={colors.accent} size={22} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 18 }
});
