import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../../src/components/AppIcon';
import { useAppTheme } from '../../../src/theme/useAppTheme';

const SECTIONS = [
  {
    title: '1. Who we are',
    body: 'Sanjari is a service for adults seeking meaningful, marriage-minded connections. By creating an account you confirm you are at least 18 years old and are using Sanjari for genuine, respectful purposes.',
  },
  {
    title: '2. Your account',
    body: 'You are responsible for the accuracy of the information you provide and for keeping your login credentials secure. One person may hold only one active account.',
  },
  {
    title: '3. Community standards',
    body: 'Harassment, hate speech, impersonation, solicitation, and any content that endangers another member is prohibited and may result in suspension or a permanent ban, with or without notice.',
  },
  {
    title: '4. Safety is shared',
    body: 'Verification badges reflect checks Sanjari has performed; they do not guarantee a member’s identity, intentions, or safety. Always meet new connections in public and tell someone you trust.',
  },
  {
    title: '5. Subscriptions',
    body: 'Paid features are billed through the app store you used to install Sanjari and are managed through your app store account settings.',
  },
  {
    title: '6. Changes to these terms',
    body: 'We may update these terms as Sanjari evolves. Continued use of the app after an update means you accept the revised terms.',
  },
  {
    title: '7. Contact',
    body: 'Questions about these terms can be sent to support through the Safety Centre in the app.',
  },
];

export default function TermsScreen() {
  const { colors, spacing, typography } = useAppTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Terms of Service</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: 6 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{section.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  content: { paddingBottom: 48 },
});
