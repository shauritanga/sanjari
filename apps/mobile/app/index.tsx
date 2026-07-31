import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../src/components/AppButton';
import { theme } from '../src/theme/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>Sanjari</Text>
        <Text style={styles.tagline}>{t('welcome')}</Text>
      </View>
      <View style={styles.actions}>
        <AppButton label={t('start')} onPress={() => router.push('/onboarding/age')} />
        <AppButton label={t('login')} variant="secondary" onPress={() => router.push('/(auth)/login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.warmWhite,
    padding: theme.spacing.lg,
    justifyContent: 'space-between'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.md
  },
  brand: {
    color: theme.colors.deepPlum,
    fontSize: 44,
    fontWeight: '700'
  },
  tagline: {
    color: theme.colors.charcoal,
    fontSize: 24,
    fontWeight: '600'
  },
  actions: {
    gap: theme.spacing.md
  }
});
