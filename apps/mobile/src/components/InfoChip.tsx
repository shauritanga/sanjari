import { Briefcase01Icon } from '@hugeicons/core-free-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { flagEmojiFor } from '../flag';

interface InfoChipProps {
  label: string;
  countryCode?: string | null;
}

/**
 * Dark translucent chip used below a member's name/location on a photo
 * overlay — a nationality chip (flag) or an occupation chip (briefcase).
 */
export function InfoChip({ label, countryCode }: InfoChipProps) {
  const flag = flagEmojiFor(countryCode);
  return (
    <View style={styles.chip}>
      {flag ? <Text style={styles.flag}>{flag}</Text> : <AppIcon icon={Briefcase01Icon} color="#FFFFFF" size={16} />}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  flag: { fontSize: 16 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }
});
