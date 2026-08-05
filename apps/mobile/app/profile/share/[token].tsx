import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileDetailView, type ProfileDetail } from '../../../src/components/ProfileDetailView';
import { api } from '../../../src/api';
import { useAppTheme } from '../../../src/theme/useAppTheme';

export default function SharedProfileScreen() {
  const { colors } = useAppTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    void api
      .get<ProfileDetail>(`/discovery/share/${token}`)
      .then((result) => {
        if (result.data) setProfile(result.data);
        else setError('This link is no longer valid.');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'This link is no longer valid.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: colors.error, fontWeight: '600' }}>{error || 'This link is no longer valid.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <ProfileDetailView profile={profile} onBack={() => router.replace('/(tabs)/discover')} banner="Shared Sanjari profile" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
