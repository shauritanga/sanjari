import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { joinConversationRoom, leaveConversationRoom, getRealtimeSocket } from '../../src/realtime';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface ConversationSummary {
  id: string;
  matchId: string;
  otherUser: { id: string; displayName: string | null };
  lastMessage: { id: string; body: string | null; senderId: string; createdAt: string; status: string } | null;
  unreadCount: number;
}

interface IncomingMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  status: string;
  createdAt: string;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await api.get<ConversationSummary[]>('/conversations');
      setItems(result.data ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

  // Join every conversation room so we can keep the list live while it's on screen,
  // and update a row's preview/unread count in place when a message arrives instead
  // of forcing a full refetch.
  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    const toJoin = [...currentIds].filter((id) => !joinedRoomsRef.current.has(id));
    toJoin.forEach((id) => {
      joinedRoomsRef.current.add(id);
      void joinConversationRoom(id);
    });
  }, [items]);

  useEffect(() => {
    let active = true;
    let client: Awaited<ReturnType<typeof getRealtimeSocket>> | null = null;

    function handleNewMessage(message: IncomingMessage) {
      setItems((current) => {
        const index = current.findIndex((item) => item.id === message.conversationId);
        if (index === -1) return current;
        const existing = current[index];
        if (!existing) return current;
        const updated: ConversationSummary = {
          ...existing,
          lastMessage: {
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            createdAt: message.createdAt,
            status: message.status,
          },
          unreadCount:
            message.senderId === existing.otherUser.id ? existing.unreadCount + 1 : existing.unreadCount,
        };
        const next = current.filter((_, itemIndex) => itemIndex !== index);
        return [updated, ...next];
      });
    }

    void getRealtimeSocket().then((socket) => {
      if (!active) return;
      client = socket;
      socket.on('message.new', handleNewMessage);
    });

    return () => {
      active = false;
      client?.off('message.new', handleNewMessage);
      joinedRoomsRef.current.forEach((id) => {
        void leaveConversationRoom(id);
      });
      joinedRoomsRef.current.clear();
    };
  }, []);

  function onRefresh() {
    setRefreshing(true);
    void load(true);
  }

  function renderRow({ item }: { item: ConversationSummary }) {
    const hasUnread = item.unreadCount > 0;
    const name = item.otherUser.displayName ?? 'Sanjari member';
    const preview = item.lastMessage
      ? item.lastMessage.body ?? 'Message removed'
      : 'Say hello 👋';

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, hasUnread ? styles.boldText : null]} numberOfLines={1}>
              {name}
            </Text>
            {item.lastMessage ? (
              <Text style={styles.timestamp}>{formatRelativeTime(item.lastMessage.createdAt)}</Text>
            ) : null}
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.preview, hasUnread ? styles.boldText : null]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeLabel}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <AppIcon icon={BubbleChatIcon} color={colors.textSecondary} size={40} />
          <Text style={styles.emptyCopy}>Your conversations will appear here after a mutual match.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
    title: { fontSize: typography.h1.fontSize, fontWeight: '800', color: colors.textPrimary },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
    emptyCopy: { fontSize: typography.body.fontSize, color: colors.textSecondary, textAlign: 'center' },
    error: { color: colors.error, textAlign: 'center' },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    separator: { height: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.accentAlt },
    rowBody: { flex: 1, gap: 4 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    name: { fontSize: typography.bodyMedium.fontSize, color: colors.textPrimary, flexShrink: 1 },
    boldText: { fontWeight: '800' },
    timestamp: { fontSize: typography.micro.fontSize, color: colors.textSecondary },
    preview: { fontSize: typography.body.fontSize, color: colors.textSecondary, flex: 1 },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    unreadBadgeLabel: { fontSize: typography.micro.fontSize, fontWeight: '800', color: colors.onAccent },
  });
}
