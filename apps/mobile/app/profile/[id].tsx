import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Flag02Icon,
  FavouriteIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  Shield01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface ProfilePhoto {
  id: string;
  isPrimary: boolean;
  url: string;
}

interface ProfileDetail {
  id: string;
  displayName: string | null;
  age: number;
  city: string | null;
  biography: string | null;
  verificationStatus: string;
  distanceCategory: string;
  photos: ProfilePhoto[];
  interests: Array<{ slug: string; labelEn: string }>;
  languages: Array<{ code: string; labelEn: string }>;
  prompts: Array<{ prompt: string; answer: string }>;
  voiceIntroUrl: string | null;
}

interface LikeResult {
  liked: true;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  likeId: string;
  matchedUser?: { id: string; displayName: string | null; primaryPhoto: { id: string; url: string } | null };
}

const DISTANCE_LABELS: Record<string, string> = {
  not_shared: 'Location private',
  nearby: 'Nearby',
  within_25km: 'Within 25 km',
  within_50km: 'Within 50 km',
  farther_away: 'Farther away',
};

function initialsFor(name: string | null) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const screenWidth = Dimensions.get('window').width;
const heroHeight = Math.round(Dimensions.get('window').height * 0.58);

function VoiceIntro({ uri, theme }: { uri: string; theme: AppTheme }) {
  const { colors, radius, spacing, typography } = theme;
  const player = useAudioPlayer(uri);
  const playerStatus = useAudioPlayerStatus(player);

  function togglePlayback() {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontSize: typography.caption.fontSize, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Voice intro
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playerStatus.playing ? 'Pause voice intro' : 'Play voice intro'}
        onPress={togglePlayback}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          padding: spacing.md,
        }}
      >
        <AppIcon icon={playerStatus.playing ? PauseCircleIcon : PlayCircleIcon} color={colors.accentAlt} size={36} />
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
          {playerStatus.playing ? 'Playing…' : 'Play voice intro'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProfileDetailScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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

  async function block() {
    if (!profile) return;
    setActionBusy(true);
    setError('');
    try {
      await api.post(`/blocks/${profile.id}`, { reason: 'Blocked from profile view.' });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to block this member.');
    } finally {
      setActionBusy(false);
    }
  }

  function confirmBlock() {
    if (!profile) return;
    Alert.alert('Block this member', `Block ${profile.displayName ?? 'this member'}? They will no longer be able to contact you.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => void block() },
    ]);
  }

  async function report() {
    if (!profile) return;
    setError('');
    try {
      await api.post('/reports', {
        reportedUserId: profile.id,
        category: 'other',
        description: 'Reported from profile view.',
      });
      setError('Report submitted for review.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit report.');
    }
  }

  function confirmReport() {
    Alert.alert('Report profile', 'Submit this profile for safety review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', onPress: () => void report() },
    ]);
  }

  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>This profile is no longer available</Text>
          <AppButton label="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.hero}>
          {profile.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setActivePhotoIndex(index);
              }}
            >
              {profile.photos.map((photo) => (
                <View key={photo.id} style={{ width: screenWidth, height: heroHeight }}>
                  <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.heroPlaceholder, { height: heroHeight }]}>
              <Text style={styles.initials}>{initialsFor(profile.displayName)}</Text>
            </View>
          )}
          <View style={styles.heroScrim} pointerEvents="none" />

          <View style={[styles.heroTopBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.roundButton}
              hitSlop={12}
            >
              <AppIcon icon={ArrowLeft01Icon} color="#FFFFFF" size={22} />
            </Pressable>
          </View>

          {profile.photos.length > 1 ? (
            <View style={[styles.dotsRow, { top: insets.top + 8 + 40 + 10 }]}>
              {profile.photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[styles.dot, { backgroundColor: index === activePhotoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.heroNamePlate}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>
                {profile.displayName ?? 'Sanjari member'}, {profile.age}
              </Text>
              {profile.verificationStatus === 'verified' ? (
                <AppIcon icon={CheckmarkBadge01Icon} color="#FFFFFF" size={20} />
              ) : null}
            </View>
            <Text style={styles.heroMeta}>
              {[profile.city, DISTANCE_LABELS[profile.distanceCategory] ?? 'Location private'].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {profile.biography ? <Text style={styles.biography}>{profile.biography}</Text> : null}

          {profile.voiceIntroUrl ? <VoiceIntro uri={profile.voiceIntroUrl} theme={theme} /> : null}

          {profile.interests.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Interests</Text>
              <View style={styles.chipWrap}>
                {profile.interests.map((interest) => (
                  <View key={interest.slug} style={styles.chip}>
                    <Text style={styles.chipLabel}>{interest.labelEn}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile.languages.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Languages</Text>
              <View style={styles.chipWrap}>
                {profile.languages.map((language) => (
                  <View key={language.code} style={styles.chip}>
                    <Text style={styles.chipLabel}>{language.labelEn}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile.prompts.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Prompts</Text>
              {profile.prompts.map((entry) => (
                <View key={entry.prompt} style={styles.promptCard}>
                  <Text style={styles.promptQuestion}>{entry.prompt}</Text>
                  <Text style={styles.promptAnswer}>{entry.answer}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.safetyRow}>
            <Pressable accessibilityRole="button" onPress={confirmBlock} style={styles.safetyAction} hitSlop={8}>
              <AppIcon icon={Shield01Icon} color={colors.textSecondary} size={16} />
              <Text style={styles.safetyLabel}>Block</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmReport} style={styles.safetyAction} hitSlop={8}>
              <AppIcon icon={Flag02Icon} color={colors.textSecondary} size={16} />
              <Text style={styles.safetyLabel}>Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ProfileActionButton
          icon={Cancel01Icon}
          label="Pass"
          color={colors.error}
          background={colors.surfaceAlt}
          disabled={actionBusy}
          onPress={() => {
            void respond('pass');
          }}
        />
        <View style={styles.likeActions}>
          <ProfileActionButton
            icon={StarIcon}
            label="Super Like"
            color={colors.accentAlt}
            background={colors.surfaceAlt}
            disabled={actionBusy}
            onPress={() => {
              void respond('like', true);
            }}
          />
          <ProfileActionButton
            icon={FavouriteIcon}
            label="Like"
            color={colors.onAccent}
            background={colors.accent}
            loading={actionBusy}
            disabled={actionBusy}
            onPress={() => {
              void respond('like', false);
            }}
          />
        </View>
      </View>
    </View>
  );
}

function ProfileActionButton({
  icon,
  label,
  color,
  background,
  onPress,
  disabled,
  loading
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  label: string;
  color: string;
  background: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors, radius } = useAppTheme();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border
        },
        {
          width: label === 'Like' ? 60 : 52,
          height: label === 'Like' ? 60 : 52,
          borderRadius: radius.pill,
          backgroundColor: background,
          opacity: isDisabled ? 0.55 : pressed ? 0.8 : 1
        }
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <AppIcon icon={icon} color={color} size={24} />}
    </Pressable>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: spacing.xl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    errorTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    error: { color: colors.error, fontWeight: '600' },
    hero: { height: heroHeight, backgroundColor: colors.surfaceAlt },
    heroPlaceholder: { width: screenWidth, alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 72, fontWeight: '800', color: colors.accentAlt },
    heroScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: heroHeight * 0.4,
      // Flat translucent scrim (no gradient dependency in this project) — dark enough
      // that the white name/meta text stays legible over any photo.
      backgroundColor: 'rgba(0,0,0,0.38)'
    },
    heroTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.lg },
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center'
    },
    dotsRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    heroNamePlate: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heroName: { fontSize: typography.display.fontSize, fontWeight: '800', color: '#FFFFFF' },
    heroMeta: { fontSize: typography.bodyLarge.fontSize, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    panel: {
      marginTop: spacing.md,
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.md
    },
    biography: { fontSize: typography.bodyLarge.fontSize, lineHeight: typography.bodyLarge.lineHeight, color: colors.textPrimary },
    section: { gap: spacing.sm },
    sectionLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 34, alignItems: 'center', justifyContent: 'center' },
    chipLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
    promptCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
    promptQuestion: { fontSize: 13, fontWeight: '700', color: colors.accentAlt },
    promptAnswer: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
    safetyRow: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm },
    safetyAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    safetyLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background
    },
    likeActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  });
}
