import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../src/api';
import { theme } from '../src/theme/theme';

type Guidance = { title: string; sections: Array<{ key: string; title: string; body: string }> };

export default function SafetyScreen() {
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api
      .get<Guidance>('/safety/guidance')
      .then((result) => setGuidance(result.data ?? null))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load safety guidance.'),
      );
  }, []);

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
  sectionTitle: { color: theme.colors.deepPlum, fontSize: 18, fontWeight: '700' },
  body: { color: theme.colors.charcoal, fontSize: 15, lineHeight: 22 },
  footer: { color: theme.colors.secondaryText, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.error },
});
