import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileDetailView, type ProfileDetail } from '../../src/components/ProfileDetailView';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function ProfilePreviewScreen() {
  const { colors } = useAppTheme();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void api
      .get<ProfileDetail>('/onboarding/preview')
      .then((result) => {
        if (result.data) setProfile(result.data);
        else setError('Unable to load your preview.');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load your preview.'))
      .finally(() => setLoading(false));
  }, []);

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
          <Text style={{ color: colors.error, fontWeight: '600' }}>{error || 'Unable to load your preview.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No `actions` prop — this reuses the exact same view Discover/Match cards
  // open, just without the like/pass footer or block/report actions.
  return (
    <ProfileDetailView
      profile={profile}
      onBack={() => router.back()}
      banner="This is how other members see your profile."
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
