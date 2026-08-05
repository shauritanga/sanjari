import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../../src/components/AppIcon';
import { useAppTheme } from '../../../src/theme/useAppTheme';

const SECTIONS = [
  {
    title: '1. What we collect',
    body: 'Profile details you provide, photos, messages, approximate location, and device information needed to run and secure the app.',
  },
  {
    title: '2. How we use it',
    body: 'To show you compatible members, protect the community from fraud and abuse, and improve matching quality. We do not sell your personal data.',
  },
  {
    title: '3. Who can see what',
    body: 'Other members see the profile fields you choose to share. Fields you hide in Settings are never shown in Discover, profile pages, or shared links.',
  },
  {
    title: '4. Chaperone and contacts features',
    body: 'If you enable a chaperone contact, message copies are sent only to the email you provide, only while forwarding is switched on. Contacts-based blocking sends one-way scrambled fingerprints of phone numbers, never the numbers themselves, and nothing from your contacts is stored on our servers.',
  },
  {
    title: '5. Your controls',
    body: 'You can export a copy of your data, deactivate your account temporarily, or delete it permanently from the Safety Centre at any time.',
  },
  {
    title: '6. Retention',
    body: 'We keep data only as long as needed to run the service or as required by law, then delete or anonymize it.',
  },
  {
    title: '7. Contact',
    body: 'Privacy questions can be sent to support through the Safety Centre in the app.',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors, spacing, typography } = useAppTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Privacy Policy</Text>
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
