import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useAppTheme } from '../theme/useAppTheme';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, step = 1, suffix, onChange }: StepperProps) {
  const { colors, radius, spacing } = useAppTheme();

  function adjust(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  }

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[styles.controls, { gap: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => adjust(-step)}
          style={[styles.button, { borderRadius: radius.pill, borderColor: colors.border }]}
        >
          <Text style={[styles.buttonLabel, { color: colors.textPrimary }]}>−</Text>
        </Pressable>
        <Text style={[styles.value, { color: colors.accentAlt }]}>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => adjust(step)}
          style={[styles.button, { borderRadius: radius.pill, borderColor: colors.border }]}
        >
          <AppIcon icon={PlusSignIcon} color={colors.textPrimary} size={14} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '600', flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  button: { width: 32, height: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 18, fontWeight: '700', marginTop: -2 },
  value: { fontSize: 17, fontWeight: '700', minWidth: 64, textAlign: 'center' }
});
