import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { ProfileDetailView, type ProfileDetail } from '../../src/components/ProfileDetailView';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';

interface LikeResult {
  liked: true;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  likeId: string;
  matchedUser?: { id: string; displayName: string | null; primaryPhoto: { id: string; url: string } | null };
}

export default function ProfileDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    setNotFound(false);
    void api
      .get<ProfileDetail>(`/discovery/profile/${id}`)
      .then((result) => {
        if (result.data) setProfile(result.data);
        else setNotFound(true);
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load this profile.';
        if (/not found/i.test(message)) setNotFound(true);
        else setError(message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function respond(action: 'like' | 'pass', priority = false) {
    if (!profile) return;
    setActionBusy(true);
    setError('');
    try {
      if (action === 'pass') {
        await api.post(`/discovery/${profile.id}/pass`, { idempotencyKey: `${profile.id}-${Date.now()}` });
        router.back();
        return;
      }
      const result = await api.post<LikeResult>(`/discovery/${profile.id}/like`, {
        priority,
        idempotencyKey: `${profile.id}-${Date.now()}`,
      });
      if (result.data?.matched) {
        router.replace({
          pathname: '/match-celebration',
          params: {
            matchId: result.data.matchId ?? '',
            conversationId: result.data.conversationId ?? '',
            displayName: result.data.matchedUser?.displayName ?? profile.displayName ?? '',
            photoId: result.data.matchedUser?.primaryPhoto?.id ?? profile.photos.find((p) => p.isPrimary)?.id ?? '',
          },
        });
      } else {
        router.back();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete this action.');
    } finally {
      setActionBusy(false);
    }
  }

  function openBlock() {
    if (!profile) return;
    router.push({
      pathname: '/profile/block',
      params: {
        userId: profile.id,
        displayName: profile.displayName ?? '',
        photoUrl: profile.photos.find((p) => p.isPrimary)?.url ?? profile.photos[0]?.url ?? '',
        // Pop block (+ any report screen it leads to) and this profile, back to whatever opened it.
        exitSteps: '2',
      },
    });
  }

  function openReport() {
    if (!profile) return;
    router.push({
      pathname: '/profile/report',
      params: { userId: profile.id, displayName: profile.displayName ?? '', mode: 'report' },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !profile) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>This profile is no longer available</Text>
          <AppButton label="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ProfileDetailView
      profile={profile}
      onBack={() => router.back()}
      error={error}
      actions={{
        busy: actionBusy,
        onPass: () => void respond('pass'),
        onSuperLike: () => void respond('like', true),
        onLike: () => void respond('like', false),
        onBlock: openBlock,
        onReport: openReport,
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
