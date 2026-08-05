import { StyleSheet, Text, View } from 'react-native';
import { flagEmojiFor } from '../flag';
import { useAppTheme } from '../theme/useAppTheme';

interface LocationBadgeProps {
  label: string;
  countryCode?: string | null;
}

/**
 * Dark translucent pill for text overlaid on a member's photo — keeps the
 * flag + location legible regardless of the underlying image's colors.
 */
export function LocationBadge({ label, countryCode }: LocationBadgeProps) {
  const { radius, spacing } = useAppTheme();
  const flag = flagEmojiFor(countryCode);
  return (
    <View style={[styles.pill, { borderRadius: radius.pill, paddingHorizontal: spacing.sm }]}>
      {flag ? <Text style={styles.flag}>{flag}</Text> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    height: 28
  },
  flag: { fontSize: 14 },
  label: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }
});
