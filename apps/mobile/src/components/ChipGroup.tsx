import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

export interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  max?: number;
}

export function ChipGroup({ options, selected, onChange, multiple = true, max }: ChipGroupProps) {
  const { colors, radius, spacing } = useAppTheme();

  function toggle(value: string) {
    const isSelected = selected.includes(value);
    if (!multiple) {
      onChange(isSelected ? [] : [value]);
      return;
    }
    if (isSelected) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    if (max && selected.length >= max) return;
    onChange([...selected, value]);
  }

  return (
    <View style={[styles.wrap, { gap: spacing.sm }]}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => toggle(option.value)}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : colors.surface
              }
            ]}
          >
            <Text style={[styles.label, { color: active ? colors.onAccent : colors.textPrimary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 14, fontWeight: '600' }
});
