import { ArrowLeft01Icon, Contact01Icon } from '@hugeicons/core-free-icons';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';

function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(stripped)) return null;
  return stripped;
}

export default function ContactsBlockScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const [status, setStatus] = useState<'idle' | 'requesting' | 'processing' | 'done'>('idle');
  const [error, setError] = useState('');
  const [blockedCount, setBlockedCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);

  async function run() {
    setStatus('requesting');
    setError('');
    try {
      const { status: permissionStatus } = await Contacts.requestPermissionsAsync();
      if (permissionStatus !== Contacts.PermissionStatus.GRANTED) {
        setError('Sanjari needs permission to read your contacts to use this feature.');
        setStatus('idle');
        return;
      }
      setStatus('processing');
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const numbers = new Set<string>();
      for (const contact of data) {
        for (const phone of contact.phoneNumbers ?? []) {
          const normalized = phone.number ? normalizePhone(phone.number) : null;
          if (normalized) numbers.add(normalized);
        }
      }
      setScannedCount(numbers.size);
      const hashes = await Promise.all(
        [...numbers].map((number) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, number)),
      );
      const result = await api.post<{ blockedCount: number }>('/contacts/block', { hashes });
      setBlockedCount(result.data?.blockedCount ?? 0);
      setStatus('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to check your contacts.');
      setStatus('idle');
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Block my contacts</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon icon={Contact01Icon} color={colors.accentAlt} size={22} />
          </View>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Avoid matching people you know</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Sanjari checks your contacts on this device against Sanjari members, using privacy-preserving matching — your
            contacts are never uploaded or stored, only one-way scrambled fingerprints are sent to find matches. Anyone
            found is automatically blocked from seeing or contacting you.
          </Text>
        </View>

        {error ? <Text style={{ color: colors.error, fontWeight: '600' }}>{error}</Text> : null}

        {status === 'done' ? (
          <Text style={{ color: colors.success, fontWeight: '600' }}>
            Checked {scannedCount} contact{scannedCount === 1 ? '' : 's'} — blocked {blockedCount} Sanjari member
            {blockedCount === 1 ? '' : 's'}.
          </Text>
        ) : (
          <AppButton
            label="Check my contacts"
            onPress={() => void run()}
            loading={status === 'requesting' || status === 'processing'}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  content: { paddingBottom: 48 },
  card: { borderWidth: 1, gap: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
