import { ArrowLeft01Icon, Cancel01Icon, CheckmarkCircle01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { useAppTheme } from '../theme/useAppTheme';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  options: SearchableSelectOption[];
  selectedValue?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  emptyLabel?: string;
}

export function SearchableSelect({
  visible,
  title,
  placeholder = 'Search…',
  options,
  selectedValue,
  onSelect,
  onClose,
  emptyLabel = 'No matches found.'
}: SearchableSelectProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} hitSlop={12}>
            <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>{title}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[styles.searchRow, { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
          <AppIcon icon={Search01Icon} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
              <AppIcon icon={Cancel01Icon} color={colors.textSecondary} size={16} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>{emptyLabel}</Text>
          }
          renderItem={({ item }) => {
            const active = item.value === selectedValue;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onSelect(item.value);
                  handleClose();
                }}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  {item.description ? (
                    <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                  ) : null}
                </View>
                {active ? <AppIcon icon={CheckmarkCircle01Icon} color={colors.accent} size={20} /> : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, marginTop: 8 },
  searchInput: { flex: 1, fontSize: 16, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDescription: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', paddingTop: 40, fontSize: 14 }
});
