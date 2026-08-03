import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { AppButton } from '../src/components/AppButton';
import { useAppTheme, type AppTheme } from '../src/theme/useAppTheme';

function initialsFor(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function MatchCelebrationScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{
    matchId: string;
    conversationId: string;
    displayName: string;
    photoId: string;
  }>();
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
  }, [scale]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const displayName = params.displayName || 'Your match';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.headline}>It&rsquo;s a match!</Text>
        <Animated.View style={[styles.photoWrap, { transform: [{ scale }] }]}>
          <Text style={styles.initials}>{initialsFor(displayName)}</Text>
        </Animated.View>
        <Text style={styles.name}>
          You and {displayName} liked each other.
        </Text>
        <Text style={styles.copy}>Say hello and see where the conversation goes.</Text>
      </View>
      <View style={styles.actions}>
        <AppButton
          label="Send a message"
          onPress={() => {
            router.replace({ pathname: '/conversation/[id]', params: { id: params.conversationId } });
          }}
        />
        <AppButton
          label="Keep discovering"
          variant="ghost"
          onPress={() => {
            router.replace('/(tabs)/discover');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
    headline: { fontSize: typography.display.fontSize, fontWeight: '800', color: colors.accent, textAlign: 'center' },
    photoWrap: {
      width: 160,
      height: 160,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 4,
      borderColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { fontSize: 56, fontWeight: '800', color: colors.accentAlt },
    name: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    copy: { fontSize: typography.body.fontSize, color: colors.textSecondary, textAlign: 'center' },
    actions: { padding: spacing.lg, gap: spacing.sm },
  });
}
