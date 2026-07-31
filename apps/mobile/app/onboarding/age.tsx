import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { theme } from '../../src/theme/theme';

export default function AgeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Adults only</Text>
        <Text style={styles.copy}>
          Sanjari is only for people who are 18 or older. Your date of birth is verified on the server and your full birth date is never shown publicly.
        </Text>
      </View>
      <AppButton label="I am 18 or older" onPress={() => router.push('/(auth)/signup')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  copy: { color: theme.colors.secondaryText, fontSize: 17, lineHeight: 25 }
});
