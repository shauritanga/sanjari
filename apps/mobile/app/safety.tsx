import {
  Alert01Icon,
  ArrowLeft01Icon,
  CheckmarkBadge01Icon,
  Database01Icon,
  Delete02Icon,
  Download01Icon,
  Location01Icon,
  MoneySecurityIcon,
  PauseIcon,
  Shield01Icon,
  UserCheck01Icon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../src/components/AppButton';
import { AppIcon } from '../src/components/AppIcon';
import { AppTextInput } from '../src/components/AppTextInput';
import { api } from '../src/api';
import { useAppTheme, type AppTheme } from '../src/theme/useAppTheme';

type Guidance = { title: string; sections: Array<{ key: string; title: string; body: string }> };
type AppealCase = {
  id: string;
  status: string;
  report: { category: string; appealStatus: string | null };
  appeals: Array<{ id: string; status: string }>;
};

const GUIDANCE_ICONS: Record<string, Parameters<typeof AppIcon>[0]['icon']> = {
  scams: MoneySecurityIcon,
  privacy: ViewOffIcon,
  meetings: Location01Icon,
  guidelines: CheckmarkBadge01Icon,
  verification: UserCheck01Icon,
  emergency: Alert01Icon,
  data: Database01Icon,
};

export default function SafetyScreen() {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { i18n } = useTranslation();

  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [appeals, setAppeals] = useState<AppealCase[]>([]);
  const [statements, setStatements] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Guidance>(`/safety/guidance?locale=${encodeURIComponent(i18n.language)}`),
      api.get<AppealCase[]>('/safety/appeals'),
    ])
      .then(([guidanceResult, appealsResult]) => {
        setGuidance(guidanceResult.data ?? null);
        setAppeals(appealsResult.data ?? []);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load safety guidance.'))
      .finally(() => setLoading(false));
  }, [i18n.language]);

  async function submitAppeal(caseId: string) {
    const statement = statements[caseId]?.trim();
    if (!statement) return;
    try {
      await api.post(`/moderation/cases/${caseId}/appeals`, { statement });
      setAppeals((current) =>
        current.map((item) =>
          item.id === caseId ? { ...item, report: { ...item.report, appealStatus: 'submitted' } } : item,
        ),
      );
      setStatements((current) => ({ ...current, [caseId]: '' }));
    } catch (cause) {
      setAccountMessage(cause instanceof Error ? cause.message : 'Unable to submit appeal.');
    }
  }

  async function requestExport() {
    setExporting(true);
    setExportMessage('');
    try {
      const result = await api.post<{ status: string }>('/safety/data-export', {});
      setExportMessage(`Data export ${result.data?.status ?? 'requested'}. We'll notify you when it's ready.`);
    } catch (cause) {
      setExportMessage(cause instanceof Error ? cause.message : 'Unable to request your data.');
    } finally {
      setExporting(false);
    }
  }

  function confirmDeactivate() {
    Alert.alert(
      'Deactivate your account?',
      'Your profile is hidden from Discover and Matches right away. Log back in any time to reactivate — nothing is deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => void deactivate() },
      ],
    );
  }

  async function deactivate() {
    setDeactivating(true);
    setAccountMessage('');
    try {
      await api.post('/safety/account-deactivation', {});
      await api.logout();
    } catch (cause) {
      setAccountMessage(cause instanceof Error ? cause.message : 'Unable to deactivate your account.');
    } finally {
      setDeactivating(false);
    }
  }

  function confirmDeletion() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, matches, and messages after a cooling-off period. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete my account', style: 'destructive', onPress: () => void requestDeletion() },
      ],
    );
  }

  async function requestDeletion() {
    setDeleting(true);
    setAccountMessage('');
    try {
      const result = await api.post<{ status: string }>('/safety/account-deletion', {});
      setAccountMessage(`Account deletion ${result.data?.status ?? 'scheduled'} after the cooling-off period.`);
    } catch (cause) {
      setAccountMessage(cause instanceof Error ? cause.message : 'Unable to request account deletion.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topBarTitle}>Safety Centre</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={[styles.reminderCard, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon icon={Shield01Icon} color={colors.accentAlt} size={20} />
            <Text style={[styles.reminderText, { color: colors.textPrimary }]}>
              Your safety comes first. Trust your instincts, and use Block or Report from any profile, match, or
              conversation when something feels wrong.
            </Text>
          </View>

          {guidance?.sections.length ? (
            <Section title={guidance.title} theme={theme}>
              {guidance.sections.map((section) => (
                <InfoRow
                  key={section.key}
                  icon={GUIDANCE_ICONS[section.key] ?? Alert01Icon}
                  title={section.title}
                  description={section.body}
                  theme={theme}
                />
              ))}
            </Section>
          ) : null}

          <Section title="Your data" theme={theme}>
            <InfoRow
              icon={Download01Icon}
              title="Request my data"
              description="Get a copy of everything Sanjari holds about your account."
              theme={theme}
            />
            <AppButton label="Request my data" variant="secondary" onPress={() => void requestExport()} loading={exporting} />
            {exportMessage ? <Text style={[styles.message, { color: colors.textSecondary }]}>{exportMessage}</Text> : null}
          </Section>

          {appeals.length > 0 ? (
            <Section title="Appeal a moderation decision" theme={theme}>
              {appeals.map((item) => (
                <View key={item.id} style={{ gap: spacing.sm }}>
                  <Text style={[styles.appealMeta, { color: colors.textSecondary }]}>
                    Category: {item.report.category} · Status: {item.report.appealStatus ?? 'not submitted'}
                  </Text>
                  {!item.report.appealStatus ? (
                    <>
                      <AppTextInput
                        label="Your statement"
                        value={statements[item.id] ?? ''}
                        onChangeText={(value) => setStatements((current) => ({ ...current, [item.id]: value }))}
                        multiline
                      />
                      <AppButton label="Submit appeal" onPress={() => void submitAppeal(item.id)} />
                    </>
                  ) : null}
                </View>
              ))}
            </Section>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.groupTitle, { color: colors.accentAlt }]}>Account</Text>

            <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={[styles.dangerIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <AppIcon icon={PauseIcon} color={colors.accentAlt} size={18} />
                </View>
                <Text style={[styles.dangerTitle, { color: colors.textPrimary }]}>Take a break</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Deactivating hides your profile everywhere immediately, without deleting anything. Log back in
                whenever you're ready and you're automatically reactivated.
              </Text>
              <AppButton
                label="Deactivate my account"
                variant="secondary"
                onPress={confirmDeactivate}
                loading={deactivating}
              />
            </View>

            <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={[styles.dangerIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <AppIcon icon={Delete02Icon} color={colors.error} size={18} />
                </View>
                <Text style={[styles.dangerTitle, { color: colors.error }]}>Leave for good</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Permanently deletes your account and data after a cooling-off period. This cannot be undone.
              </Text>
              <AppButton
                label="Delete my account"
                variant="ghost"
                onPress={confirmDeletion}
                loading={deleting}
              />
            </View>

            {accountMessage ? <Text style={[styles.message, { color: colors.textSecondary }]}>{accountMessage}</Text> : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, theme, children }: { title: string; theme: AppTheme; children: React.ReactNode }) {
  const { colors, radius, spacing } = theme;
  return (
    <View
      style={[
        localStyles.section,
        { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
      ]}
    >
      <Text style={{ color: colors.accentAlt, fontSize: 15, fontWeight: '800' }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  title,
  description,
  theme,
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  title: string;
  description: string;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={[localStyles.rowIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
        <AppIcon icon={icon} color={colors.accentAlt} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{description}</Text>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  section: { borderWidth: 1 },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

function createStyles({ colors, spacing, typography, radius }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    topBarTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    error: { color: colors.error, fontWeight: '600' },
    reminderCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, alignItems: 'flex-start' },
    reminderText: { flex: 1, fontSize: 13, lineHeight: 19 },
    groupTitle: { fontSize: 15, fontWeight: '800' },
    dangerCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
    dangerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dangerTitle: { fontSize: 15, fontWeight: '700' },
    body: { fontSize: 13, lineHeight: 19 },
    message: { fontSize: 13, fontWeight: '600' },
    appealMeta: { fontSize: 13, fontWeight: '600' },
  });
}
