import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const { colors, radius } = useAppTheme();
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  return (
    <View style={[styles.track, { backgroundColor: colors.border, borderRadius: radius.pill }]}>
      <View
        style={[
          styles.fill,
          { width: `${ratio * 100}%`, backgroundColor: colors.accent, borderRadius: radius.pill }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, width: '100%', overflow: 'hidden' },
  fill: { height: '100%' }
});
