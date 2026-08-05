import { ArrowLeft01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { AppTextInput } from '../../src/components/AppTextInput';
import { ToggleRow } from '../../src/components/ToggleRow';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';

interface Chaperone {
  name: string;
  relationship: string;
  email: string;
  forwardEnabled: boolean;
}

export default function ChaperoneScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChaperone, setHasChaperone] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .get<Chaperone | null>('/onboarding/chaperone')
      .then((result) => {
        if (result.data) {
          setHasChaperone(true);
          setName(result.data.name);
          setRelationship(result.data.relationship);
          setEmail(result.data.email);
          setForwardEnabled(result.data.forwardEnabled);
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load your chaperone.'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.put('/onboarding/chaperone', { name, relationship, email, forwardEnabled });
      setHasChaperone(true);
      setNotice('Chaperone details saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your chaperone.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError('');
    try {
      await api.remove('/onboarding/chaperone');
      setHasChaperone(false);
      setName('');
      setRelationship('');
      setEmail('');
      setForwardEnabled(false);
      setNotice('Chaperone removed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove your chaperone.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Chaperone</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
              <AppIcon icon={UserGroupIcon} color={colors.accentAlt} size={22} />
            </View>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Add a trusted chaperone</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              A chaperone (wali, family member, or trusted friend) can be looped in on your conversations for extra peace of mind.
            </Text>
          </View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}

          <View style={{ gap: spacing.md }}>
            <AppTextInput label="Chaperone's name" value={name} onChangeText={setName} placeholder="e.g. Amina Hassan" />
            <AppTextInput label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="e.g. Mother, Wali, Sister" />
            <AppTextInput
              label="Chaperone's email"
              value={email}
              onChangeText={setEmail}
              placeholder="chaperone@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <ToggleRow
              title="Forward conversation copies"
              description="Email your chaperone a copy of new messages in your conversations."
              value={forwardEnabled}
              onChange={setForwardEnabled}
            />
          </View>

          <AppButton
            label={hasChaperone ? 'Save changes' : 'Add chaperone'}
            onPress={() => void save()}
            loading={saving}
            disabled={!name.trim() || !relationship.trim() || !email.includes('@')}
          />
          {hasChaperone ? (
            <AppButton label="Remove chaperone" variant="ghost" onPress={() => void remove()} disabled={saving} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  card: { borderWidth: 1, gap: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  error: { fontWeight: '600' },
  notice: { fontWeight: '600' },
});
