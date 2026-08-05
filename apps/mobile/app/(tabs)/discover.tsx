import {
  Alert01Icon,
  Cancel01Icon,
  FavouriteIcon,
  FilterIcon,
  Search01Icon,
  StarIcon,
  UndoIcon
} from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AppButton } from '../../src/components/AppButton';
import { InfoChip } from '../../src/components/InfoChip';
import { LocationBadge } from '../../src/components/LocationBadge';
import { VerificationBadge, type VerificationFlags } from '../../src/components/VerificationBadge';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useDiscoveryFiltersStore } from '../../src/store/discoveryFilters';
import { useAppTheme } from '../../src/theme/useAppTheme';

interface Candidate {
  id: string;
  displayName: string | null;
  age: number | null;
  city: string | null;
  countryCode: string | null;
  countryName: string | null;
  occupationCategory: string | null;
  distanceCategory: string;
  verificationStatus: string;
  verification: VerificationFlags;
  primaryPhoto: { id: string; url: string } | null;
  score: number;
  explanation: { rankingVersion: string; components: Record<string, number> };
}

interface LikeResult {
  liked: true;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  likeId: string;
  matchedUser?: { id: string; displayName: string | null; primaryPhoto: { id: string; url: string } | null };
}

const SWIPE_THRESHOLD = 120;

function distanceLabel(category: string): string {
  switch (category) {
    case 'not_shared':
      return 'Location private';
    case 'nearby':
      return 'Nearby';
    case 'within_25km':
      return 'Within 25 km';
    case 'within_50km':
      return 'Within 50 km';
    case 'farther_away':
      return 'Farther away';
    default:
      return 'Distance unknown';
  }
}

export default function DiscoverScreen() {
  const { colors, radius, spacing, typography } = useAppTheme();
  const recentlyActive = useDiscoveryFiltersStore((state) => state.recentlyActive);
  const newMembers = useDiscoveryFiltersStore((state) => state.newMembers);

  const [queue, setQueue] = useState<Candidate[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const lastActionRef = useRef<{ candidate: Candidate; action: 'like' | 'pass' } | null>(null);
  const awaitingSafetyActionRef = useRef(false);

  const loadDiscovery = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (recentlyActive) params.set('recentlyActive', 'true');
      if (newMembers) params.set('newMembers', 'true');
      const query = params.toString();
      // The API envelope contains the candidate array directly in `data`.
      const result = await api.get<Candidate[]>(`/discovery${query ? `?${query}` : ''}`);
      const candidates = result.data ?? [];
      setQueue((current) => (cursor ? [...current, ...candidates] : candidates));
      setNextCursor((result as typeof result & { nextCursor?: string | null }).nextCursor ?? null);
    },
    [recentlyActive, newMembers]
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    lastActionRef.current = null;
    void loadDiscovery(null)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load discovery.'))
      .finally(() => setLoading(false));
  }, [loadDiscovery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loading && queue.length === 0 && nextCursor) {
      void loadDiscovery(nextCursor).catch(() => undefined);
    }
  }, [loading, queue.length, nextCursor, loadDiscovery]);

  // The block screen is pushed on top of this one; once the user returns having
  // blocked someone, refresh so the (now-excluded) candidate stops showing up.
  useFocusEffect(
    useCallback(() => {
      if (awaitingSafetyActionRef.current) {
        awaitingSafetyActionRef.current = false;
        refresh();
      }
    }, [refresh])
  );

  const current = queue[0] ?? null;

  function removeFromQueue(candidateId: string) {
    setQueue((currentQueue) => currentQueue.filter((item) => item.id !== candidateId));
  }

  async function like(candidate: Candidate, priority: boolean) {
    setBanner('');
    setBusy(true);
    removeFromQueue(candidate.id);
    lastActionRef.current = { candidate, action: 'like' };
    try {
      const result = await api.post<LikeResult>(`/discovery/${candidate.id}/like`, {
        priority,
        idempotencyKey: `${candidate.id}-${Date.now()}`
      });
      if (result.data?.matched) {
        router.push({
          pathname: '/match-celebration',
          params: {
            matchId: result.data.matchId ?? '',
            conversationId: result.data.conversationId ?? '',
            displayName: result.data.matchedUser?.displayName ?? '',
            photoId: result.data.matchedUser?.primaryPhoto?.id ?? ''
          }
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to like this profile.');
    } finally {
      setBusy(false);
    }
  }

  async function pass(candidate: Candidate) {
    setBanner('');
    setBusy(true);
    removeFromQueue(candidate.id);
    lastActionRef.current = { candidate, action: 'pass' };
    try {
      await api.post(`/discovery/${candidate.id}/pass`, {
        idempotencyKey: `${candidate.id}-${Date.now()}`
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to pass on this profile.');
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    const last = lastActionRef.current;
    if (!last) return;
    setBanner('');
    setUndoing(true);
    try {
      await api.post('/discovery/undo', { targetUserId: last.candidate.id });
      setQueue((currentQueue) => [last.candidate, ...currentQueue]);
      lastActionRef.current = null;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to undo your last action.';
      if (message.toLowerCase().includes('eligible plan')) {
        setBanner('Undo requires an eligible plan.');
      } else {
        setError(message);
      }
    } finally {
      setUndoing(false);
    }
  }

  function openBlock(candidate: Candidate) {
    awaitingSafetyActionRef.current = true;
    router.push({
      pathname: '/profile/block',
      params: {
        userId: candidate.id,
        displayName: candidate.displayName ?? '',
        photoUrl: candidate.primaryPhoto?.url ?? '',
        exitSteps: '1'
      }
    });
  }

  function openReport(candidate: Candidate) {
    router.push({
      pathname: '/profile/report',
      params: { userId: candidate.id, displayName: candidate.displayName ?? '', mode: 'report', exitSteps: '1' }
    });
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}> 
        <View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>Discover</Text>
          <Text
            style={{
              color: colors.accentAlt,
              fontSize: typography.h1.fontSize,
              lineHeight: typography.h1.lineHeight,
              fontWeight: typography.h1.fontWeight
            }}
          >
            Find your match
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          onPress={() => router.push('/filters')}
          style={[styles.filterButton, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}
          hitSlop={8}
        >
          <AppIcon icon={FilterIcon} color={colors.accentAlt} size={20} />
        </Pressable>
      </View>

      {banner ? (
        <View style={[styles.banner, { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
          <Text style={{ color: colors.accentAlt, fontWeight: '600' }}>{banner}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={[styles.centered, { paddingHorizontal: spacing.xl, gap: spacing.md }]}>
          <AppIcon icon={Alert01Icon} color={colors.error} size={40} />
          <Text style={{ color: colors.textPrimary, textAlign: 'center', fontWeight: '600' }}>{error}</Text>
          <AppButton label="Try again" onPress={refresh} />
        </View>
      ) : !current ? (
        <View style={[styles.centered, { paddingHorizontal: spacing.xl, gap: spacing.md }]}>
          <AppIcon icon={Search01Icon} color={colors.textSecondary} size={40} />
          <Text style={{ color: colors.textPrimary, textAlign: 'center', fontSize: 18, fontWeight: '700' }}>
            No new profiles right now
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            Check back later, or widen your filters to see more people.
          </Text>
          <AppButton label="Refresh" onPress={refresh} />
        </View>
      ) : (
        <View style={[styles.deck, { paddingHorizontal: spacing.lg }]}>
          <SwipeCard
            key={current.id}
            candidate={current}
            onSwipeLeft={() => {
              void pass(current);
            }}
            onSwipeRight={() => {
              void like(current, false);
            }}
            onTap={() => router.push(`/profile/${current.id}`)}
          />
        </View>
      )}

      {!loading && !error && current ? (
        <View style={[styles.actions, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm }]}>
          <View style={[styles.actionRow, { gap: spacing.md }]}>
            <RoundAction
              icon={Cancel01Icon}
              color={colors.error}
              background={colors.surface}
              onPress={() => void pass(current)}
              disabled={busy}
              label="Pass"
            />
            <RoundAction
              icon={UndoIcon}
              color={colors.gold}
              background={colors.surface}
              onPress={() => void undo()}
              disabled={!lastActionRef.current || undoing}
              label="Undo"
              small
            />
            <RoundAction
              icon={StarIcon}
              color={colors.accentAlt}
              background={colors.surface}
              onPress={() => void like(current, true)}
              disabled={busy}
              label="Super-like"
              small
            />
            <RoundAction
              icon={FavouriteIcon}
              color={colors.onAccent}
              background={colors.accent}
              onPress={() => void like(current, false)}
              disabled={busy}
              label="Like"
            />
          </View>
          <View style={[styles.safetyRow, { gap: spacing.lg }]}>
            <Pressable onPress={() => openBlock(current)} hitSlop={8}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Block</Text>
            </Pressable>
            <Pressable onPress={() => openReport(current)} hitSlop={8}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Report</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function RoundAction({
  icon,
  color,
  background,
  onPress,
  disabled,
  label,
  small
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  color: string;
  background: string;
  onPress: () => void;
  disabled?: boolean;
  label: string;
  small?: boolean;
}) {
  const { colors, radius } = useAppTheme();
  const size = small ? 44 : 56;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.roundAction,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: background,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : 1
        }
      ]}
    >
      <AppIcon icon={icon} color={color} size={small ? 18 : 24} />
    </Pressable>
  );
}

interface SwipeCardProps {
  candidate: Candidate;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

function SwipeCard({ candidate, onSwipeLeft, onSwipeRight, onTap }: SwipeCardProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipeLeft = useCallback(() => onSwipeLeft(), [onSwipeLeft]);
  const handleSwipeRight = useCallback(() => onSwipeRight(), [onSwipeRight]);
  const handleTap = useCallback(() => onTap(), [onTap]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(width * 1.5, { duration: 220 }, (finished) => {
          if (finished) runOnJS(handleSwipeRight)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-width * 1.5, { duration: 220 }, (finished) => {
          if (finished) runOnJS(handleSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-12, 0, 12], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` }
      ]
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP)
  }));

  const initial = (candidate.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';

  return (
    <GestureDetector gesture={panGesture}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${candidate.displayName ?? 'Sanjari member'}'s profile`}
        onPress={handleTap}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
          styles.card,
          cardStyle,
          { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }
          ]}
        >
        <View style={[styles.photo, { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg }]}>
          {candidate.primaryPhoto?.url ? (
            <Image
              source={{ uri: candidate.primaryPhoto.url }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={[styles.photoInitial, { color: colors.accentAlt }]}>{initial}</Text>
          )}
        </View>

        <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle, { borderColor: colors.success }]}>
          <Text style={[styles.stampText, { color: colors.success }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle, { borderColor: colors.error }]}>
          <Text style={[styles.stampText, { color: colors.error }]}>PASS</Text>
        </Animated.View>

        {/* <View style={[styles.cardScrim, { borderRadius: radius.lg }]} pointerEvents="none" /> */}
        <View style={[styles.cardInfo, { padding: spacing.lg, gap: spacing.sm }]}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {candidate.displayName ?? 'Sanjari member'}
              {candidate.age != null ? `, ${candidate.age}` : ''}
            </Text>
            <VerificationBadge
              displayName={candidate.displayName ?? 'This member'}
              tone="overlay"
              size={28}
              {...candidate.verification}
            />
          </View>
          <LocationBadge
            countryCode={candidate.countryCode}
            label={[distanceLabel(candidate.distanceCategory), candidate.city, candidate.countryName]
              .filter(Boolean)
              .join(', ')}
          />
          {candidate.countryName || candidate.occupationCategory ? (
            <View style={styles.chipRow}>
              {candidate.countryName ? (
                <InfoChip label={candidate.countryName} countryCode={candidate.countryCode} />
              ) : null}
              {candidate.occupationCategory ? <InfoChip label={candidate.occupationCategory} /> : null}
            </View>
          ) : null}
          {/* <Text style={styles.compatibility}>
            {candidate.score}% compatibility based on your shared preferences.
          </Text> */}
        </View>
        </Animated.View>
      </Pressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: { paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deck: { flex: 1, paddingVertical: 12 },
  card: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden'
  },
  photo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 96, fontWeight: '800' },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(0,0,0,0.42)'
  },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  name: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  compatibility: { color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  stamp: {
    position: 'absolute',
    top: 32,
    borderWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  likeStamp: { left: 24, transform: [{ rotate: '-18deg' }] },
  passStamp: { right: 24, transform: [{ rotate: '18deg' }] },
  stampText: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  actions: {},
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  safetyRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 4 },
  roundAction: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 }
});
