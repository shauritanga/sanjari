import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { api } from '../src/api';
import { theme } from '../src/theme/theme';

type Plan = { id: string; code: string; title: string; description: string; priceCents: number; currency: string };
type Status = { status: string; plan: { code: string; title: string } | null; endsAt: string | null; entitlements: Record<string, boolean> };

export default function PremiumScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void Promise.all([api.get<Plan[]>('/subscriptions/plans'), api.get<Status>('/subscriptions/status')])
      .then(([plansResult, statusResult]) => {
        setPlans(plansResult.data ?? []);
        setStatus(statusResult.data ?? null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load premium access.'));
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Premium access</Text>
        <Text style={styles.subtitle}>Your access is verified by Sanjari&apos;s server.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.current}>
          <Text style={styles.sectionTitle}>Current status</Text>
          <Text style={styles.status}>{status?.status ?? 'Loading...'}</Text>
          {status?.plan ? <Text style={styles.body}>{status.plan.title}{status.endsAt ? ` · Ends ${new Date(status.endsAt).toLocaleDateString()}` : ''}</Text> : null}
          {status?.entitlements && Object.keys(status.entitlements).length > 0 ? <Text style={styles.body}>{Object.entries(status.entitlements).filter(([, enabled]) => enabled).map(([key]) => key).join(', ')}</Text> : null}
        </View>
        {plans.map((plan) => (
          <View style={styles.plan} key={plan.id}>
            <Text style={styles.sectionTitle}>{plan.title}</Text>
            <Text style={styles.body}>{plan.description}</Text>
            <Text style={styles.price}>{(plan.priceCents / 100).toFixed(2)} {plan.currency}</Text>
            <AppButton label="Purchase in the app store" variant="secondary" onPress={() => setError('Purchases are completed through the verified app-store flow.')} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  subtitle: { color: theme.colors.charcoal, lineHeight: 21 },
  sectionTitle: { color: theme.colors.deepPlum, fontSize: 20, fontWeight: '700' },
  status: { color: theme.colors.coral, fontSize: 24, fontWeight: '700' },
  body: { color: theme.colors.charcoal, lineHeight: 21 },
  price: { color: theme.colors.deepPlum, fontSize: 18, fontWeight: '700' },
  current: { gap: theme.spacing.sm, backgroundColor: theme.colors.softRose, borderRadius: theme.radius.md, padding: theme.spacing.md },
  plan: { gap: theme.spacing.sm, backgroundColor: '#FFFFFF', borderRadius: theme.radius.md, padding: theme.spacing.md },
  error: { color: theme.colors.error },
});
