import {
  ArrowLeft01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckCheckIcon,
  Image01Icon,
  MessageCircleReplyIcon,
  Mic01Icon,
  PauseCircleIcon,
  PlayCircleIcon,
  SentIcon,
  StopCircleIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { drainMessages, enqueueMessage } from '../../src/offline-message-queue';
import { uploadBinaryFile } from '../../src/upload';
import {
  emitPresence,
  emitTyping,
  getRealtimeSocket,
  joinConversationRoom,
  leaveConversationRoom,
} from '../../src/realtime';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

const SWIPE_TRIGGER_DISTANCE = 56;
const SWIPE_MAX_DISTANCE = 76;

const REACTION_OPTIONS = ['❤️', '😂', '😮', '😢', '👍'];
const TYPING_IDLE_MS = 3000;
const TYPING_CLEAR_MS = 4000;
const MAX_RECORDING_MS = 120_000;
const MAX_PHOTOS_PER_MESSAGE = 10;
const READ_TICK_BLUE = '#34B7F1';
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface ReplyPreview {
  id: string;
  senderId: string;
  body: string | null;
}

interface MessageReaction {
  userId: string;
  reaction: string;
}

interface MessageReceipt {
  userId: string;
  type: string;
  createdAt: string;
}

interface MessageAttachment {
  id: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  waveform?: number[] | null;
  durationSeconds?: number | null;
}

interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  body: string | null;
  status: string;
  createdAt: string;
  replyToMessageId?: string | null;
  replyTo?: ReplyPreview | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  receipts?: MessageReceipt[];
}

interface ConversationSummary {
  id: string;
  otherUser: { id: string; displayName: string | null; online: boolean; lastActiveAt: string | null };
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const WAVEFORM_BAR_COUNT = 40;

/** Averages raw metering samples down to a fixed number of bars for display. */
function downsampleWaveform(samples: number[]): number[] {
  if (samples.length === 0) return [];
  const bars: number[] = [];
  const chunkSize = samples.length / WAVEFORM_BAR_COUNT;
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i += 1) {
    const start = Math.floor(i * chunkSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * chunkSize));
    const chunk = samples.slice(start, end);
    const average = chunk.reduce((sum, value) => sum + value, 0) / chunk.length;
    bars.push(Number(average.toFixed(3)));
  }
  return bars;
}

function formatLastSeen(iso: string | null): string | null {
  if (!iso) return null;
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Last seen ${days}d ago`;
}

function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isAttachmentPlaceholderBody(body: string | null): boolean {
  return body != null && (body === '🎤 Voice note' || body.startsWith('📷'));
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Used for voice notes sent before waveform capture existed, so old messages still render bars.
const FALLBACK_WAVEFORM = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) =>
  0.35 + 0.3 * Math.abs(Math.sin(index * 0.9)),
);

function VoiceMessagePlayer({
  attachment,
  isSelf,
  theme,
}: {
  attachment: MessageAttachment;
  isSelf: boolean;
  theme: AppTheme;
}) {
  const { colors, spacing } = theme;
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) void player.seekTo(0);
    player.play();
  }

  const duration = attachment.durationSeconds ?? status.duration ?? 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const bars = attachment.waveform?.length ? attachment.waveform : FALLBACK_WAVEFORM;
  const activeColor = isSelf ? colors.onAccent : colors.accent;
  const inactiveColor = isSelf ? 'rgba(255,255,255,0.4)' : colors.border;
  const remaining = Math.max(0, duration - status.currentTime);
  const displaySeconds = status.playing || status.currentTime > 0 ? remaining : duration;

  return (
    <View style={[voiceStyles.row, { gap: spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        onPress={toggle}
        hitSlop={8}
      >
        <AppIcon icon={status.playing ? PauseCircleIcon : PlayCircleIcon} color={activeColor} size={32} />
      </Pressable>
      <View style={voiceStyles.waveform}>
        {bars.map((level, index) => (
          <View
            key={index}
            style={[
              voiceStyles.bar,
              {
                height: Math.max(3, level * 24),
                backgroundColor: index / bars.length <= progress ? activeColor : inactiveColor,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[voiceStyles.duration, { color: isSelf ? colors.onAccent : colors.textSecondary }]}>
        {formatDuration(displaySeconds)}
      </Text>
    </View>
  );
}

const voiceStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2, minWidth: 200 },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { flex: 1, borderRadius: 2, minWidth: 2 },
  duration: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

function SwipeToReply({ children, onTrigger }: { children: ReactNode; onTrigger: () => void }) {
  const { colors } = useAppTheme();
  const translateX = useSharedValue(0);
  const triggered = useSharedValue(false);

  const pan = Gesture.Pan()
    .activeOffsetX([-1000, 12])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const next = Math.max(0, Math.min(event.translationX, SWIPE_MAX_DISTANCE));
      translateX.value = next;
      if (next >= SWIPE_TRIGGER_DISTANCE && !triggered.value) {
        triggered.value = true;
        runOnJS(onTrigger)();
      }
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 260 });
      triggered.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const iconStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / SWIPE_TRIGGER_DISTANCE, 1);
    return { opacity: progress, transform: [{ scale: 0.5 + progress * 0.5 }] };
  });

  return (
    <View style={{ justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[swipeReplyIconStyle, iconStyle]}>
        <AppIcon icon={MessageCircleReplyIcon} color={colors.textSecondary} size={20} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const swipeReplyIconStyle = {
  position: 'absolute' as const,
  left: -34,
  top: '50%' as const,
  marginTop: -12,
};

export default function ConversationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const photoViewerRef = useRef<FlatList<MessageAttachment>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [otherUserName, setOtherUserName] = useState('Sanjari member');
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastActiveAt, setOtherLastActiveAt] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [typingActive, setTypingActive] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState<string | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ photos: MessageAttachment[]; index: number } | null>(
    null,
  );

  const currentUserIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const readMarkedRef = useRef<Set<string>>(new Set());
  const pendingSendsRef = useRef<
    Array<{ replyToMessageId: string | undefined; replyTo: ReplyPreview | null }>
  >([]);
  const pendingAttachmentsRef = useRef<Map<string, MessageAttachment[]>>(new Map());

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  const waveformSamplesRef = useRef<number[]>([]);

  messagesRef.current = messages;

  const markRead = useCallback(
    (messageId: string) => {
      if (readMarkedRef.current.has(messageId)) return;
      readMarkedRef.current.add(messageId);
      void api.post(`/conversations/${id}/read`, { messageId }).catch(() => {
        readMarkedRef.current.delete(messageId);
      });
    },
    [id],
  );

  const applyReplyLookup = useCallback((message: ChatMessage): ChatMessage => {
    if (message.replyTo || !message.replyToMessageId) return message;
    const found = messagesRef.current.find((entry) => entry.id === message.replyToMessageId);
    if (!found) return message;
    return { ...message, replyTo: { id: found.id, senderId: found.senderId, body: found.body } };
  }, []);

  // Current user id — needed to tell "my" messages apart from the other participant's.
  useEffect(() => {
    void api
      .get<{ userId: string }>('/onboarding')
      .then((result) => {
        if (result.data?.userId) currentUserIdRef.current = result.data.userId;
      })
      .catch(() => {});
  }, []);

  // Best-effort header name and presence — not critical to correctness, so failures are silent.
  useEffect(() => {
    void api
      .get<ConversationSummary[]>('/conversations')
      .then((result) => {
        const match = result.data?.find((item) => item.id === id);
        if (!match) return;
        if (match.otherUser.displayName) setOtherUserName(match.otherUser.displayName);
        setOtherUserId(match.otherUser.id);
        setOtherOnline(match.otherUser.online);
        setOtherLastActiveAt(match.otherUser.lastActiveAt);
      })
      .catch(() => {});
  }, [id]);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setError('');
    try {
      const result = (await api.get<ChatMessage[]>(`/conversations/${id}/messages`)) as {
        data?: ChatMessage[];
        nextCursor?: string | null;
      };
      const data = result.data ?? [];
      setMessages(data);
      setNextCursor(result.nextCursor ?? null);
      const lastIncoming = data.find(
        (message) =>
          message.senderId !== currentUserIdRef.current &&
          !message.receipts?.some((receipt) => receipt.userId === currentUserIdRef.current),
      );
      if (lastIncoming) markRead(lastIncoming.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this conversation.');
    } finally {
      setLoadingInitial(false);
    }
  }, [id, markRead]);

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = (await api.get<ChatMessage[]>(
        `/conversations/${id}/messages?cursor=${nextCursor}`,
      )) as { data?: ChatMessage[]; nextCursor?: string | null };
      setMessages((current) => [...current, ...(result.data ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load earlier messages.');
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    void joinConversationRoom(id).then(() => emitPresence('online'));
    void drainMessages(async (message) => {
      if (message.conversationId === id)
        await api.post(`/conversations/${id}/messages`, { body: message.body });
    });
    return () => {
      void emitPresence('offline');
      void leaveConversationRoom(id);
    };
  }, [id, loadInitial]);

  useEffect(() => {
    let active = true;

    function handleNewMessage(message: ChatMessage) {
      if (message.conversationId !== id) return;
      setMessages((current) => {
        if (current.some((entry) => entry.id === message.id)) return current;
        let next = { ...message };
        if (message.senderId === currentUserIdRef.current) {
          const pendingIndex = pendingSendsRef.current.findIndex(
            (entry) => (entry.replyToMessageId ?? null) === (message.replyToMessageId ?? null),
          );
          if (pendingIndex !== -1) {
            const [pending] = pendingSendsRef.current.splice(pendingIndex, 1);
            if (pending?.replyTo) next.replyTo = pending.replyTo;
          }
        }
        const pendingAttachments = pendingAttachmentsRef.current.get(next.id);
        if (pendingAttachments) {
          next.attachments = [...(next.attachments ?? []), ...pendingAttachments];
          pendingAttachmentsRef.current.delete(next.id);
        }
        next = applyReplyLookup(next);
        return [next, ...current];
      });
      if (message.senderId !== currentUserIdRef.current) {
        void api.post(`/conversations/${id}/delivered`, { messageIds: [message.id] }).catch(() => {});
        setTimeout(() => markRead(message.id), 400);
      }
    }

    function handleReaction(payload: {
      messageId: string;
      userId: string;
      reaction: string;
      conversationId?: string;
    }) {
      setMessages((current) =>
        current.map((entry) => {
          if (entry.id !== payload.messageId) return entry;
          const existingReactions = entry.reactions ?? [];
          if (
            existingReactions.some(
              (r) => r.userId === payload.userId && r.reaction === payload.reaction,
            )
          ) {
            return entry;
          }
          return {
            ...entry,
            reactions: [
              ...existingReactions,
              { userId: payload.userId, reaction: payload.reaction },
            ],
          };
        }),
      );
    }

    function addReceipt(messageId: string, userId: string, type: string) {
      setMessages((current) =>
        current.map((entry) => {
          if (entry.id !== messageId) return entry;
          const existingReceipts = entry.receipts ?? [];
          if (existingReceipts.some((r) => r.userId === userId && r.type === type)) return entry;
          return {
            ...entry,
            receipts: [...existingReceipts, { userId, type, createdAt: new Date().toISOString() }],
          };
        }),
      );
    }

    function handleRead(payload: { messageId: string; userId: string }) {
      addReceipt(payload.messageId, payload.userId, 'read');
    }

    function handleDelivered(payload: { messageId: string; userId: string }) {
      addReceipt(payload.messageId, payload.userId, 'delivered');
    }

    function handleTyping(payload: { conversationId: string; active: boolean; userId: string }) {
      if (payload.conversationId !== id) return;
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
      if (payload.active) {
        setTypingActive(true);
        typingClearTimeoutRef.current = setTimeout(() => setTypingActive(false), TYPING_CLEAR_MS);
      } else {
        setTypingActive(false);
      }
    }

    function handlePresence(payload: { userId: string; state: 'online' | 'away' | 'offline' }) {
      if (payload.userId !== otherUserId) return;
      setOtherOnline(payload.state === 'online');
      if (payload.state !== 'online') setOtherLastActiveAt(new Date().toISOString());
    }

    void getRealtimeSocket().then((socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.on('message.new', handleNewMessage);
      socket.on('message.reaction', handleReaction);
      socket.on('message.read', handleRead);
      socket.on('message.delivered', handleDelivered);
      socket.on('conversation.typing', handleTyping);
      socket.on('presence.update', handlePresence);
    });

    return () => {
      active = false;
      const socket = socketRef.current;
      socket?.off('message.new', handleNewMessage);
      socket?.off('message.reaction', handleReaction);
      socket?.off('message.read', handleRead);
      socket?.off('message.delivered', handleDelivered);
      socket?.off('conversation.typing', handleTyping);
      socket?.off('presence.update', handlePresence);
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, markRead, applyReplyLookup, otherUserId]);

  function stopTyping() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      void emitTyping(id, false);
    }
  }

  function handleBodyChange(next: string) {
    setBody(next);
    if (next.length === 0) {
      stopTyping();
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      void emitTyping(id, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }

  async function sendMessage(text: string, replyToMessageId?: string) {
    const socket = socketRef.current;
    if (socket?.connected) {
      pendingSendsRef.current.push({
        replyToMessageId,
        replyTo: replyToMessageId ? replyTo : null,
      });
      socket.emit('message.send', { conversationId: id, body: text, replyToMessageId });
      return;
    }
    try {
      const result = await api.post<ChatMessage>(`/conversations/${id}/messages`, {
        body: text,
        replyToMessageId,
      });
      if (result.data) {
        const withReply: ChatMessage =
          replyToMessageId && replyTo ? { ...result.data, replyTo } : result.data;
        setMessages((current) =>
          current.some((entry) => entry.id === withReply.id) ? current : [withReply, ...current],
        );
      }
    } catch {
      await enqueueMessage({ conversationId: id, body: text });
      setNotice('Message queued and will retry when connected.');
    }
  }

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    stopTyping();
    const replyToMessageId = replyTo?.id;
    try {
      await sendMessage(text, replyToMessageId);
      setBody('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  async function reportMessage(message: ChatMessage) {
    try {
      await api.post('/reports', {
        reportedUserId: message.senderId,
        category: 'other',
        description: 'Reported from a conversation.',
        evidence: [{ type: 'message', referenceId: message.id }],
      });
      setNotice('Report submitted for review.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit report.');
    }
  }

  async function deleteMessage(message: ChatMessage) {
    try {
      await api.remove(`/conversations/messages/${message.id}`);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === message.id ? { ...entry, body: null, attachments: [] } : entry,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this message.');
    }
  }

  async function reactToMessage(message: ChatMessage, reaction: string) {
    const selfId = currentUserIdRef.current;
    try {
      await api.post(`/conversations/messages/${message.id}/reactions`, { reaction });
      if (selfId) {
        setMessages((current) =>
          current.map((entry) => {
            if (entry.id !== message.id) return entry;
            const existing = entry.reactions ?? [];
            if (existing.some((r) => r.userId === selfId && r.reaction === reaction)) return entry;
            return { ...entry, reactions: [...existing, { userId: selfId, reaction }] };
          }),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add reaction.');
    }
  }

  function openReply(message: ChatMessage) {
    setReplyTo({ id: message.id, senderId: message.senderId, body: message.body });
    setSelectedMessage(null);
  }

  async function sendAttachmentMessage(
    placeholderBody: string,
    files: Array<{
      uri: string;
      mimeType: string;
      sizeBytes: number;
      waveform?: number[];
      durationSeconds?: number;
    }>,
  ) {
    setAttachmentBusy(placeholderBody);
    setError('');
    try {
      const created = await api.post<ChatMessage>(`/conversations/${id}/messages`, {
        body: placeholderBody,
      });
      if (!created.data) throw new Error('Unable to send attachment.');
      const messageId = created.data.id;
      // Uploaded sequentially so a mid-batch failure still leaves earlier photos attached.
      for (const file of files) {
        const presign = await api.post<{ storageKey: string; uploadUrl: string }>(
          `/conversations/${id}/messages/${messageId}/attachments/presign`,
          { mimeType: file.mimeType, sizeBytes: String(file.sizeBytes) },
        );
        if (!presign.data) throw new Error('Unable to prepare upload.');
        await uploadBinaryFile(file.uri, presign.data.uploadUrl, file.mimeType);
        const completed = await api.post<MessageAttachment>(
          `/conversations/${id}/messages/${messageId}/attachments/complete`,
          {
            storageKey: presign.data.storageKey,
            mimeType: file.mimeType,
            sizeBytes: String(file.sizeBytes),
            ...(file.waveform ? { waveform: file.waveform } : {}),
            ...(file.durationSeconds != null ? { durationSeconds: file.durationSeconds } : {}),
          },
        );
        if (completed.data) {
          setMessages((current) => {
            const index = current.findIndex((entry) => entry.id === messageId);
            if (index === -1) {
              const existing = pendingAttachmentsRef.current.get(messageId) ?? [];
              pendingAttachmentsRef.current.set(messageId, [...existing, completed.data!]);
              return current;
            }
            return current.map((entry) =>
              entry.id === messageId
                ? { ...entry, attachments: [...(entry.attachments ?? []), completed.data!] }
                : entry,
            );
          });
        }
      }
      // The socket broadcasts the parent message already (since sending goes through
      // the REST endpoint, which also emits `message.new`); if it hasn't landed locally
      // yet we still appended it above via `created.data` as a safety net.
      setMessages((current) =>
        current.some((entry) => entry.id === messageId) ? current : [created.data!, ...current],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attachment upload failed.');
    } finally {
      setAttachmentBusy(null);
    }
  }

  async function pickPhoto() {
    setAttachmentSheetOpen(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to send photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS_PER_MESSAGE,
      });
      if (result.canceled || result.assets.length === 0) return;
      const files = result.assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        sizeBytes: asset.fileSize ?? 2_000_000,
      }));
      const placeholder = files.length > 1 ? `📷 ${files.length} photos` : '📷 Photo';
      await sendAttachmentMessage(placeholder, files);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send this photo.');
    }
  }

  async function startVoiceNote() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone access needed', 'Allow microphone access to send voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      waveformSamplesRef.current = [];
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingActive(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start recording.');
    }
  }

  async function stopVoiceNote() {
    setRecordingActive(false);
    setAttachmentSheetOpen(false);
    try {
      const durationSeconds = recorderState.durationMillis / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setError('Recording did not save. Please try again.');
        return;
      }
      const sizeBytes = new File(uri).size ?? 500_000;
      const waveform = downsampleWaveform(waveformSamplesRef.current);
      await sendAttachmentMessage('🎤 Voice note', [
        { uri, mimeType: 'audio/m4a', sizeBytes, waveform, durationSeconds },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send this voice note.');
    }
  }

  useEffect(() => {
    if (!recordingActive) return;
    if (recorderState.durationMillis >= MAX_RECORDING_MS) {
      void stopVoiceNote();
    }
  }, [recorderState.durationMillis, recordingActive]);

  useEffect(() => {
    if (!recordingActive || recorderState.metering == null) return;
    // dBFS metering, roughly -60 (near silence) to 0 (peak) for voice.
    const normalized = Math.max(0, Math.min(1, (recorderState.metering + 60) / 60));
    waveformSamplesRef.current.push(normalized);
  }, [recordingActive, recorderState.metering]);

  function renderReplyStrip(message: ChatMessage) {
    const preview =
      message.replyTo ?? (message.replyToMessageId ? applyReplyLookup(message).replyTo : null);
    if (!message.replyToMessageId) return null;
    const isSelf = message.senderId === currentUserIdRef.current;
    return (
      <View
        style={[styles.replyStrip, { borderLeftColor: isSelf ? colors.onAccent : colors.accent }]}
      >
        <Text
          style={[
            styles.replyStripText,
            { color: isSelf ? colors.onAccent : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {preview ? (preview.body ?? 'Message removed') : 'Replying to a message'}
        </Text>
      </View>
    );
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isSelf = item.senderId === currentUserIdRef.current;
    const otherReceipts = (item.receipts ?? []).filter(
      (receipt) => receipt.userId !== currentUserIdRef.current,
    );
    const deliveryState: 'sent' | 'delivered' | 'read' = otherReceipts.some(
      (receipt) => receipt.type === 'read',
    )
      ? 'read'
      : otherReceipts.some((receipt) => receipt.type === 'delivered')
        ? 'delivered'
        : 'sent';
    const groupedReactions = (item.reactions ?? []).reduce<Record<string, number>>(
      (acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const attachments = item.attachments ?? [];
    const showBodyText =
      item.body != null &&
      !(attachments.length > 0 && isAttachmentPlaceholderBody(item.body));

    return (
      <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
        <SwipeToReply onTrigger={() => openReply(item)}>
          <Pressable
            onLongPress={() => setSelectedMessage(item)}
            style={[
              styles.bubble,
              {
                backgroundColor: isSelf ? colors.accent : colors.surfaceAlt,
                borderTopRightRadius: isSelf ? 4 : theme.radius.lg,
                borderTopLeftRadius: isSelf ? theme.radius.lg : 4,
              },
            ]}
          >
            {renderReplyStrip(item)}
            {showBodyText ? (
              <Text
                style={[
                  styles.bubbleText,
                  { color: isSelf ? colors.onAccent : colors.textPrimary },
                ]}
              >
                {item.body ?? 'Message removed'}
              </Text>
            ) : null}
            {(() => {
              const imageAttachments = attachments.filter((entry) => isImageAttachment(entry.mimeType));
              if (imageAttachments.length > 0) {
                const isGrid = imageAttachments.length > 1;
                return (
                  <View style={isGrid ? styles.attachmentGrid : undefined}>
                    {imageAttachments.map((attachment, index) => (
                      <Pressable
                        key={attachment.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open photo ${index + 1}`}
                        onPress={() => setPhotoViewer({ photos: imageAttachments, index })}
                        style={isGrid ? styles.attachmentGridItem : undefined}
                      >
                        <Image
                          source={{ uri: attachment.url }}
                          style={isGrid ? styles.attachmentGridImage : styles.attachmentImage}
                          contentFit="cover"
                          transition={150}
                        />
                      </Pressable>
                    ))}
                  </View>
                );
              }
              return null;
            })()}
            {attachments.map((attachment) =>
              isImageAttachment(attachment.mimeType) ? null : (
                <VoiceMessagePlayer key={attachment.id} attachment={attachment} isSelf={isSelf} theme={theme} />
              ),
            )}
            {item.status === 'pending_review' ? (
              <Text style={[styles.warning, { color: isSelf ? colors.onAccent : colors.error }]}>
                This message is being reviewed.
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.metaText,
                  { color: isSelf ? colors.onAccent : colors.textSecondary },
                ]}
              >
                {formatClockTime(item.createdAt)}
              </Text>
              {isSelf ? (
                <AppIcon
                  icon={deliveryState === 'sent' ? Tick01Icon : CheckCheckIcon}
                  color={deliveryState === 'read' ? READ_TICK_BLUE : colors.onAccent}
                  size={14}
                />
              ) : null}
            </View>
          </Pressable>
        </SwipeToReply>
        {Object.keys(groupedReactions).length > 0 ? (
          <View
            style={[styles.reactionRow, isSelf ? styles.reactionRowSelf : styles.reactionRowOther]}
          >
            {Object.entries(groupedReactions).map(([reaction, count]) => (
              <View key={reaction} style={styles.reactionPill}>
                <Text style={styles.reactionPillText}>
                  {reaction}
                  {count > 1 ? ` ${count}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            {typingActive ? (
              <Text style={styles.headerTyping}>typing…</Text>
            ) : otherOnline ? (
              <View style={styles.headerPresenceRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerPresence}>Online</Text>
              </View>
            ) : formatLastSeen(otherLastActiveAt) ? (
              <Text style={styles.headerPresence}>{formatLastSeen(otherLastActiveAt)}</Text>
            ) : null}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {loadingInitial ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyCopy}>
              Say hello — this is the start of your conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.list}
            ListFooterComponent={
              nextCursor ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void loadOlder();
                  }}
                  style={styles.loadMore}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={styles.loadMoreLabel}>Load earlier messages</Text>
                  )}
                </Pressable>
              ) : null
            }
          />
        )}

        {replyTo ? (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerText}>
              <Text style={styles.replyBannerLabel}>Replying to</Text>
              <Text style={styles.replyBannerBody} numberOfLines={1}>
                {replyTo.body ?? 'Message removed'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
              onPress={() => setReplyTo(null)}
              hitSlop={8}
            >
              <AppIcon icon={Cancel01Icon} color={colors.textSecondary} size={18} />
            </Pressable>
          </View>
        ) : null}

        {attachmentBusy ? (
          <View style={styles.replyBanner}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.replyBannerLabel}>
              {attachmentBusy?.startsWith('📷') ? 'Sending photo…' : 'Sending voice note…'}
            </Text>
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            onPress={() => setAttachmentSheetOpen(true)}
            style={styles.attachButton}
            hitSlop={8}
          >
            <AppIcon icon={Attachment01Icon} color={colors.textSecondary} size={22} />
          </Pressable>
          <TextInput
            value={body}
            onChangeText={handleBodyChange}
            placeholder="Write a message…"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={() => {
              void handleSend();
            }}
            disabled={!body.trim() || sending}
            style={[
              styles.sendButton,
              { backgroundColor: colors.accent, opacity: !body.trim() || sending ? 0.5 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <AppIcon icon={SentIcon} color={colors.onAccent} size={20} />
            )}
          </Pressable>
        </View>

        {attachmentSheetOpen ? (
          <View style={styles.sheetBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => (recordingActive ? undefined : setAttachmentSheetOpen(false))}
            />
            <View style={styles.sheet}>
              {recordingActive ? (
                <>
                  <Text style={styles.sheetTitle}>
                    Recording…{' '}
                    {Math.min(120, Math.round((recorderState.durationMillis ?? 0) / 1000))}s / 120s
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void stopVoiceNote();
                    }}
                    style={[styles.sheetAction, { backgroundColor: colors.error }]}
                  >
                    <AppIcon icon={StopCircleIcon} color={colors.onAccent} size={20} />
                    <Text style={[styles.sheetActionLabel, { color: colors.onAccent }]}>
                      Stop and send
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Add to your message</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void pickPhoto();
                    }}
                    style={styles.sheetAction}
                  >
                    <AppIcon icon={Image01Icon} color={colors.textPrimary} size={20} />
                    <Text style={styles.sheetActionLabel}>Photo</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void startVoiceNote();
                    }}
                    style={styles.sheetAction}
                  >
                    <AppIcon icon={Mic01Icon} color={colors.textPrimary} size={20} />
                    <Text style={styles.sheetActionLabel}>Voice note</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAttachmentSheetOpen(false)}
                    style={[styles.sheetAction, styles.sheetCancel]}
                  >
                    <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : null}

        {selectedMessage ? (
          <View style={styles.sheetBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedMessage(null)} />
            <View style={styles.sheet}>
              <View style={styles.reactionPickerRow}>
                {REACTION_OPTIONS.map((reaction) => (
                  <Pressable
                    key={reaction}
                    accessibilityRole="button"
                    onPress={() => {
                      void reactToMessage(selectedMessage, reaction);
                      setSelectedMessage(null);
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.reactionPickerEmoji}>{reaction}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => openReply(selectedMessage)}
                style={styles.sheetAction}
              >
                <Text style={styles.sheetActionLabel}>Reply</Text>
              </Pressable>
              {selectedMessage.senderId === currentUserIdRef.current ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const target = selectedMessage;
                    setSelectedMessage(null);
                    Alert.alert('Delete message', 'This message will be removed for both of you.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void deleteMessage(target),
                      },
                    ]);
                  }}
                  style={styles.sheetAction}
                >
                  <Text style={[styles.sheetActionLabel, { color: colors.error }]}>
                    Delete message
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const target = selectedMessage;
                    setSelectedMessage(null);
                    Alert.alert('Report message', 'Submit this message for safety review?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Report', onPress: () => void reportMessage(target) },
                    ]);
                  }}
                  style={styles.sheetAction}
                >
                  <Text style={[styles.sheetActionLabel, { color: colors.error }]}>
                    Report message
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedMessage(null)}
                style={[styles.sheetAction, styles.sheetCancel]}
              >
                <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal
        visible={photoViewer != null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhotoViewer(null)}
        onShow={() => {
          photoViewerRef.current?.scrollToIndex({ index: photoViewer?.index ?? 0, animated: false });
        }}
      >
        <View style={styles.photoViewer}>
          <FlatList
            ref={photoViewerRef}
            data={photoViewer?.photos ?? []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(photo) => photo.id}
            initialScrollIndex={photoViewer?.index ?? 0}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setPhotoViewer((current) => (current ? { ...current, index } : current));
            }}
            renderItem={({ item }) => (
              <View style={styles.photoViewerPage}>
                <Image source={{ uri: item.url }} style={styles.photoViewerImage} contentFit="contain" />
              </View>
            )}
          />
          {(photoViewer?.photos.length ?? 0) > 1 ? (
            <View style={[styles.photoViewerCounter, { top: insets.top + 12 }]} pointerEvents="none">
              <Text style={styles.photoViewerCounterText}>
                {(photoViewer?.index ?? 0) + 1} / {photoViewer?.photos.length}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            onPress={() => setPhotoViewer(null)}
            style={[styles.photoViewerClose, { top: insets.top + 12 }]}
            hitSlop={10}
          >
            <AppIcon icon={Cancel01Icon} color="#FFFFFF" size={24} />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    flexOne: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerText: { flex: 1 },
    headerName: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    headerTyping: { fontSize: typography.caption.fontSize, color: colors.accent },
    headerPresence: { fontSize: typography.caption.fontSize, color: colors.textSecondary },
    headerPresenceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
    headerSpacer: { width: 22 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyCopy: {
      color: colors.textSecondary,
      textAlign: 'center',
      fontSize: typography.body.fontSize,
    },
    error: { color: colors.error, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    notice: {
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      fontSize: typography.caption.fontSize,
    },
    list: { padding: spacing.lg, gap: spacing.sm },
    loadMore: { alignItems: 'center', paddingVertical: spacing.md },
    loadMoreLabel: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: typography.caption.fontSize,
    },
    messageRow: { gap: 4, maxWidth: '84%' },
    messageRowSelf: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    messageRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 4,
    },
    bubbleText: { fontSize: typography.body.fontSize, lineHeight: 21 },
    replyStrip: { borderLeftWidth: 3, paddingLeft: spacing.sm, marginBottom: 4 },
    replyStripText: { fontSize: typography.caption.fontSize, fontStyle: 'italic' },
    attachmentImage: { width: 220, height: 220, borderRadius: radius.md, marginTop: 2 },
    attachmentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 220,
      gap: 4,
      marginTop: 2,
    },
    attachmentGridItem: { width: 108, height: 108 },
    attachmentGridImage: { width: '100%', height: '100%', borderRadius: radius.sm },
    photoViewer: { flex: 1, backgroundColor: '#000000' },
    photoViewerPage: { width: screenWidth, height: screenHeight, justifyContent: 'center' },
    photoViewerImage: { width: screenWidth, height: screenHeight },
    photoViewerClose: {
      position: 'absolute',
      right: 20,
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    photoViewerCounter: {
      position: 'absolute',
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    photoViewerCounterText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    warning: { fontSize: typography.micro.fontSize, marginTop: 2 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      alignSelf: 'flex-end',
    },
    metaText: { fontSize: typography.micro.fontSize },
    reactionRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    reactionRowSelf: { justifyContent: 'flex-end' },
    reactionRowOther: { justifyContent: 'flex-start' },
    reactionPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    reactionPillText: { fontSize: typography.caption.fontSize, color: colors.textPrimary },
    replyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    replyBannerText: { flex: 1, gap: 2 },
    replyBannerLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: '700',
      color: colors.accentAlt,
    },
    replyBannerBody: { fontSize: typography.caption.fontSize, color: colors.textSecondary },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    attachButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      fontSize: typography.body.fontSize,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    sheetTitle: {
      fontSize: typography.h3.fontSize,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sheetAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    sheetCancel: { backgroundColor: 'transparent' },
    sheetActionLabel: {
      fontSize: typography.bodyMedium.fontSize,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reactionPickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.sm,
    },
    reactionPickerEmoji: { fontSize: 30 },
  });
}
