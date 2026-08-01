import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../src/components/AppButton';
import { AppTextInput } from '../src/components/AppTextInput';
import { api } from '../src/api';
import { theme } from '../src/theme/theme';

type Guidance = { title: string; sections: Array<{ key: string; title: string; body: string }> };
type AppealCase = {
  id: string;
  status: string;
  report: { category: string; appealStatus: string | null };
  appeals: Array<{ id: string; status: string }>;
};

export default function SafetyScreen() {
  const { i18n } = useTranslation();
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [error, setError] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [appeals, setAppeals] = useState<AppealCase[]>([]);
  const [statements, setStatements] = useState<Record<string, string>>({});

  useEffect(() => {
    void api
      .get<Guidance>(`/safety/guidance?locale=${encodeURIComponent(i18n.language)}`)
      .then((result) => setGuidance(result.data ?? null))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load safety guidance.'),
      );
    void api
      .get<AppealCase[]>('/safety/appeals')
      .then((result) => setAppeals(result.data ?? []))
      .catch(() => undefined);
  }, [i18n.language]);

  async function submitAppeal(caseId: string) {
    const statement = statements[caseId]?.trim();
    if (!statement) return;
    try {
      await api.post(`/moderation/cases/${caseId}/appeals`, { statement });
      setAppeals((current) =>
        current.map((item) =>
          item.id === caseId
            ? { ...item, report: { ...item.report, appealStatus: 'submitted' } }
            : item,
        ),
      );
      setStatements((current) => ({ ...current, [caseId]: '' }));
    } catch (cause) {
      setDataMessage(cause instanceof Error ? cause.message : 'Unable to submit appeal.');
    }
  }

  async function requestExport() {
    try {
      const result = await api.post<{ status: string }>('/safety/data-export', {});
      setDataMessage(`Data export: ${result.data?.status ?? 'requested'}.`);
    } catch (cause) {
      setDataMessage(cause instanceof Error ? cause.message : 'Unable to request your data.');
    }
  }

  async function requestDeletion() {
    try {
      const result = await api.post<{ status: string }>('/safety/account-deletion', {});
      setDataMessage(
        `Account deletion: ${result.data?.status ?? 'scheduled'} after the cooling-off period.`,
      );
    } catch (cause) {
      setDataMessage(
        cause instanceof Error ? cause.message : 'Unable to request account deletion.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SANJARI SAFETY</Text>
        <Text style={styles.title}>{guidance?.title ?? 'Safety Centre'}</Text>
        <Text style={styles.intro}>
          Your safety comes first. Trust your instincts and report anything that feels wrong.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {guidance?.sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
        <View style={styles.dataControls}>
          <Text style={styles.sectionTitle}>Data controls</Text>
          <Text style={styles.body}>Request a copy of your data or schedule account deletion.</Text>
          <AppButton label="Request my data" onPress={() => void requestExport()} />
          <AppButton
            label="Schedule account deletion"
            variant="secondary"
            onPress={() => void requestDeletion()}
          />
          {dataMessage ? <Text style={styles.footer}>{dataMessage}</Text> : null}
        </View>
        {appeals.map((item) => (
          <View key={item.id} style={styles.dataControls}>
            <Text style={styles.sectionTitle}>Appeal a moderation decision</Text>
            <Text style={styles.body}>
              Category: {item.report.category}. Status:{' '}
              {item.report.appealStatus ?? 'not submitted'}.
            </Text>
            {!item.report.appealStatus ? (
              <>
                <AppTextInput
                  label="Your statement"
                  value={statements[item.id] ?? ''}
                  onChangeText={(value) =>
                    setStatements((current) => ({ ...current, [item.id]: value }))
                  }
                />
                <AppButton label="Submit appeal" onPress={() => void submitAppeal(item.id)} />
              </>
            ) : null}
          </View>
        ))}
        <Text style={styles.footer}>
          Use Block and Report from a profile, match, or conversation when you need help.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  eyebrow: { color: theme.colors.coral, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  intro: { color: theme.colors.charcoal, fontSize: 16, lineHeight: 24 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  dataControls: { gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.deepPlum, fontSize: 18, fontWeight: '700' },
  body: { color: theme.colors.charcoal, fontSize: 15, lineHeight: 22 },
  footer: { color: theme.colors.secondaryText, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.error },
});
