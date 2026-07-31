import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';
export default function ProfileOnboardingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  async function save() {
    try {
      await api.put('/onboarding', { step: 2, displayName, city, biography: bio });
      router.replace('/(tabs)/profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Build your profile</Text>
        <Text style={styles.copy}>You can return and continue anytime.</Text>
        <AppTextInput label="Display name" value={displayName} onChangeText={setDisplayName} />
        <AppTextInput label="City" value={city} onChangeText={setCity} />
        <AppTextInput label="About you" value={bio} onChangeText={setBio} error={error} />
        <AppButton
          label="Save and continue"
          onPress={() => {
            void save();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  copy: { color: theme.colors.secondaryText, fontSize: 16 },
});
