import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

interface ToggleRowProps {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ title, description, value, onChange }: ToggleRowProps) {
  const { colors, spacing } = useAppTheme();
  return (
    <View style={[styles.row, { paddingVertical: spacing.sm, gap: spacing.md }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 18 }
});
