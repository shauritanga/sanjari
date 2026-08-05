import { ArrowLeft01Icon, PauseCircleIcon, PlayCircleIcon } from '@hugeicons/core-free-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { InfoChip } from '../../src/components/InfoChip';
import { LocationBadge } from '../../src/components/LocationBadge';
import { VerificationBadge, type VerificationFlags } from '../../src/components/VerificationBadge';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface PreviewPhoto {
  id: string;
  isPrimary: boolean;
  url: string;
}

interface PreviewProfile {
  id: string;
  displayName: string | null;
  age: number | null;
  city: string | null;
  countryCode: string | null;
  countryName: string | null;
  occupationCategory: string | null;
  educationLevel: string | null;
  heightCm: number | null;
  memberSince: string;
  biography: string | null;
  verification: VerificationFlags;
  photos: PreviewPhoto[];
  interests: Array<{ slug: string; labelEn: string }>;
  languages: Array<{ code: string; labelEn: string }>;
  prompts: Array<{ prompt: string; answer: string }>;
  voiceIntroUrl: string | null;
}

const screenWidth = Dimensions.get('window').width;

function VoiceIntroPlayer({ uri, theme }: { uri: string; theme: AppTheme }) {
  const { colors, radius, spacing } = theme;
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice intro' : 'Play voice intro'}
      onPress={() => (status.playing ? player.pause() : player.play())}
      style={[styles.voiceRow, { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }]}
    >
      <AppIcon icon={status.playing ? PauseCircleIcon : PlayCircleIcon} color={colors.accentAlt} size={32} />
      <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
        {status.playing ? 'Playing voice intro…' : 'Play voice intro'}
      </Text>
    </Pressable>
  );
}

export default function ProfilePreviewScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const [profile, setProfile] = useState<PreviewProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void api
      .get<PreviewProfile>('/onboarding/preview')
      .then((result) => {
        if (result.data) setProfile(result.data);
        else setError('Unable to load your preview.');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load your preview.'))
      .finally(() => setLoading(false));
  }, []);

  const styles2 = createStyles(theme);
  const primaryPhoto = profile?.photos.find((photo) => photo.isPrimary) ?? profile?.photos[0];

  return (
    <SafeAreaView style={styles2.screen} edges={['top', 'bottom']}>
      <View style={styles2.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to editing" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles2.topBarTitle}>Preview</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles2.banner}>
        <Text style={styles2.bannerText}>This is how other members see your profile.</Text>
      </View>

      {loading ? (
        <View style={styles2.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error || !profile ? (
        <View style={styles2.centered}>
          <Text style={{ color: colors.error, fontWeight: '600' }}>{error || 'Unable to load your preview.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles2.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles2.hero}>
            {primaryPhoto?.url ? (
              <Image source={{ uri: primaryPhoto.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles2.heroPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ fontSize: 60, fontWeight: '800', color: colors.accentAlt }}>
                  {(profile.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S'}
                </Text>
              </View>
            )}
            <View style={styles2.heroScrim} pointerEvents="none" />
            <View style={styles2.heroNamePlate}>
              <View style={styles2.nameRow}>
                <Text style={styles2.heroName}>
                  {profile.displayName ?? 'Sanjari member'}
                  {profile.age != null ? `, ${profile.age}` : ''}
                </Text>
                <VerificationBadge
                  displayName={profile.displayName ?? 'This member'}
                  tone="overlay"
                  size={22}
                  {...profile.verification}
                />
              </View>
              {profile.city ? (
                <LocationBadge countryCode={profile.countryCode} label={[profile.city, profile.countryName].filter(Boolean).join(', ')} />
              ) : null}
            </View>
          </View>

          {profile.countryName || profile.occupationCategory || profile.educationLevel || profile.heightCm ? (
            <View style={styles2.chipRow}>
              {profile.countryName ? <InfoChip label={profile.countryName} countryCode={profile.countryCode} /> : null}
              {profile.occupationCategory ? <InfoChip label={profile.occupationCategory} /> : null}
              {profile.educationLevel ? <InfoChip label={profile.educationLevel} /> : null}
              {profile.heightCm ? <InfoChip label={`${profile.heightCm} cm`} /> : null}
            </View>
          ) : null}

          <View style={styles2.panel}>
            {profile.biography ? <Text style={styles2.biography}>{profile.biography}</Text> : null}

            {profile.voiceIntroUrl ? <VoiceIntroPlayer uri={profile.voiceIntroUrl} theme={theme} /> : null}

            {profile.interests.length > 0 ? (
              <View style={styles2.section}>
                <Text style={styles2.sectionLabel}>Interests</Text>
                <View style={styles2.wrap}>
                  {profile.interests.map((interest) => (
                    <View key={interest.slug} style={[styles2.chip, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>{interest.labelEn}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {profile.languages.length > 0 ? (
              <View style={styles2.section}>
                <Text style={styles2.sectionLabel}>Languages</Text>
                <View style={styles2.wrap}>
                  {profile.languages.map((language) => (
                    <View key={language.code} style={[styles2.chip, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>{language.labelEn}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {profile.prompts.length > 0 ? (
              <View style={styles2.section}>
                <Text style={styles2.sectionLabel}>Prompts</Text>
                {profile.prompts.map((entry) => (
                  <View key={entry.prompt} style={[styles2.promptCard, { borderColor: colors.border }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accentAlt }}>{entry.prompt}</Text>
                    <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textPrimary }}>{entry.answer}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  voiceRow: { flexDirection: 'row', alignItems: 'center' }
});

const heroHeight = Math.round(Dimensions.get('window').height * 0.58);

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm
    },
    topBarTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    banner: { backgroundColor: colors.surfaceAlt, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
    bannerText: { color: colors.accentAlt, fontWeight: '600', fontSize: 13, textAlign: 'center' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: spacing.xl },
    hero: { width: screenWidth, height: heroHeight, backgroundColor: colors.surfaceAlt },
    heroPlaceholder: { width: screenWidth, height: heroHeight, alignItems: 'center', justifyContent: 'center' },
    heroScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: heroHeight * 0.4,
      backgroundColor: 'rgba(0,0,0,0.38)'
    },
    heroNamePlate: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heroName: { fontSize: typography.display.fontSize, fontWeight: '800', color: '#FFFFFF' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    panel: { padding: spacing.lg, gap: spacing.md },
    biography: { fontSize: typography.bodyLarge.fontSize, lineHeight: typography.bodyLarge.lineHeight, color: colors.textPrimary },
    section: { gap: spacing.sm },
    sectionLabel: { fontSize: typography.caption.fontSize, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 34, alignItems: 'center', justifyContent: 'center' },
    promptCard: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 4, marginBottom: spacing.sm }
  });
}
