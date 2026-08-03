import {
  ArrowLeft01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckCheckIcon,
  Image01Icon,
  Mic01Icon,
  SentIcon,
  StopCircleIcon,
} from '@hugeicons/core-free-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Socket } from 'socket.io-client';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { drainMessages, enqueueMessage } from '../../src/offline-message-queue';
import { uploadBinaryFile } from '../../src/upload';
import {
  emitTyping,
  getRealtimeSocket,
  joinConversationRoom,
  leaveConversationRoom,
} from '../../src/realtime';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

const REACTION_OPTIONS = ['❤️', '😂', '😮', '😢', '👍'];
const TYPING_IDLE_MS = 3000;
const TYPING_CLEAR_MS = 4000;
const MAX_RECORDING_MS = 120_000;

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
  createdAt: string;
}

interface MessageAttachment {
  id: string;
  mimeType: string;
  sizeBytes: number;
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
  otherUser: { id: string; displayName: string | null };
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export default function ConversationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [otherUserName, setOtherUserName] = useState('Sanjari member');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [typingActive, setTypingActive] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState<string | null>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const readMarkedRef = useRef<Set<string>>(new Set());
  const pendingSendsRef = useRef<Array<{ replyToMessageId: string | undefined; replyTo: ReplyPreview | null }>>([]);
  const pendingAttachmentsRef = useRef<Map<string, MessageAttachment[]>>(new Map());

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

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

  // Best-effort header name — not critical to correctness, so failures are silent.
  useEffect(() => {
    void api
      .get<ConversationSummary[]>('/conversations')
      .then((result) => {
        const match = result.data?.find((item) => item.id === id);
        if (match?.otherUser.displayName) setOtherUserName(match.otherUser.displayName);
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
    void joinConversationRoom(id);
    void drainMessages(async (message) => {
      if (message.conversationId === id) await api.post(`/conversations/${id}/messages`, { body: message.body });
    });
    return () => {
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
        setTimeout(() => markRead(message.id), 400);
      }
    }

    function handleReaction(payload: { messageId: string; userId: string; reaction: string; conversationId?: string }) {
      setMessages((current) =>
        current.map((entry) => {
          if (entry.id !== payload.messageId) return entry;
          const existingReactions = entry.reactions ?? [];
          if (existingReactions.some((r) => r.userId === payload.userId && r.reaction === payload.reaction)) {
            return entry;
          }
          return { ...entry, reactions: [...existingReactions, { userId: payload.userId, reaction: payload.reaction }] };
        }),
      );
    }

    function handleRead(payload: { messageId: string; userId: string }) {
      setMessages((current) =>
        current.map((entry) => {
          if (entry.id !== payload.messageId) return entry;
          const existingReceipts = entry.receipts ?? [];
          if (existingReceipts.some((r) => r.userId === payload.userId)) return entry;
          return { ...entry, receipts: [...existingReceipts, { userId: payload.userId, createdAt: new Date().toISOString() }] };
        }),
      );
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

    void getRealtimeSocket().then((socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.on('message.new', handleNewMessage);
      socket.on('message.reaction', handleReaction);
      socket.on('message.read', handleRead);
      socket.on('conversation.typing', handleTyping);
    });

    return () => {
      active = false;
      const socket = socketRef.current;
      socket?.off('message.new', handleNewMessage);
      socket?.off('message.reaction', handleReaction);
      socket?.off('message.read', handleRead);
      socket?.off('conversation.typing', handleTyping);
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, markRead, applyReplyLookup]);

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
      pendingSendsRef.current.push({ replyToMessageId, replyTo: replyToMessageId ? replyTo : null });
      socket.emit('message.send', { conversationId: id, body: text, replyToMessageId });
      return;
    }
    try {
      const result = await api.post<ChatMessage>(`/conversations/${id}/messages`, {
        body: text,
        replyToMessageId,
      });
      if (result.data) {
        const withReply: ChatMessage = replyToMessageId && replyTo ? { ...result.data, replyTo } : result.data;
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
        current.map((entry) => (entry.id === message.id ? { ...entry, body: null, attachments: [] } : entry)),
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

  async function sendAttachmentMessage(placeholderBody: string, uri: string, mimeType: string, sizeBytes: number) {
    setAttachmentBusy(placeholderBody);
    setError('');
    try {
      const created = await api.post<ChatMessage>(`/conversations/${id}/messages`, { body: placeholderBody });
      if (!created.data) throw new Error('Unable to send attachment.');
      const messageId = created.data.id;
      const presign = await api.post<{ storageKey: string; uploadUrl: string }>(
        `/conversations/${id}/messages/${messageId}/attachments/presign`,
        { mimeType, sizeBytes: String(sizeBytes) },
      );
      if (!presign.data) throw new Error('Unable to prepare upload.');
      await uploadBinaryFile(uri, presign.data.uploadUrl, mimeType);
      const completed = await api.post<MessageAttachment>(
        `/conversations/${id}/messages/${messageId}/attachments/complete`,
        { storageKey: presign.data.storageKey, mimeType, sizeBytes: String(sizeBytes) },
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
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const sizeBytes = asset.fileSize ?? 2_000_000;
      await sendAttachmentMessage('📷 Photo', asset.uri, mimeType, sizeBytes);
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
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setError('Recording did not save. Please try again.');
        return;
      }
      const sizeBytes = new File(uri).size ?? 500_000;
      await sendAttachmentMessage('🎤 Voice note', uri, 'audio/m4a', sizeBytes);
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

  function renderReplyStrip(message: ChatMessage) {
    const preview = message.replyTo ?? (message.replyToMessageId ? applyReplyLookup(message).replyTo : null);
    if (!message.replyToMessageId) return null;
    const isSelf = message.senderId === currentUserIdRef.current;
    return (
      <View
        style={[
          styles.replyStrip,
          { borderLeftColor: isSelf ? colors.onAccent : colors.accent },
        ]}
      >
        <Text
          style={[styles.replyStripText, { color: isSelf ? colors.onAccent : colors.textSecondary }]}
          numberOfLines={1}
        >
          {preview ? preview.body ?? 'Message removed' : 'Replying to a message'}
        </Text>
      </View>
    );
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isSelf = item.senderId === currentUserIdRef.current;
    const isLatestSelf = isSelf && messages.find((entry) => entry.senderId === currentUserIdRef.current)?.id === item.id;
    const wasRead = isLatestSelf && (item.receipts ?? []).some((receipt) => receipt.userId !== currentUserIdRef.current);
    const groupedReactions = (item.reactions ?? []).reduce<Record<string, number>>((acc, reaction) => {
      acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
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
          <Text style={[styles.bubbleText, { color: isSelf ? colors.onAccent : colors.textPrimary }]}>
            {item.body ?? 'Message removed'}
          </Text>
          {(item.attachments ?? []).map((attachment) => (
            <View key={attachment.id} style={styles.attachmentRow}>
              <AppIcon
                icon={isImageAttachment(attachment.mimeType) ? Image01Icon : Mic01Icon}
                color={isSelf ? colors.onAccent : colors.textSecondary}
                size={16}
              />
              <Text style={[styles.attachmentLabel, { color: isSelf ? colors.onAccent : colors.textSecondary }]}>
                {isImageAttachment(attachment.mimeType) ? 'Photo' : 'Voice note sent'}
              </Text>
            </View>
          ))}
          {item.status === 'pending_review' ? (
            <Text style={[styles.warning, { color: isSelf ? colors.onAccent : colors.error }]}>
              This message is being reviewed.
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: isSelf ? colors.onAccent : colors.textSecondary }]}>
              {formatClockTime(item.createdAt)}
            </Text>
            {wasRead ? (
              <AppIcon icon={CheckCheckIcon} color={colors.onAccent} size={14} />
            ) : null}
          </View>
        </Pressable>
        {Object.keys(groupedReactions).length > 0 ? (
          <View style={[styles.reactionRow, isSelf ? styles.reactionRowSelf : styles.reactionRowOther]}>
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{otherUserName}</Text>
          {typingActive ? <Text style={styles.headerTyping}>typing…</Text> : null}
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
          <Text style={styles.emptyCopy}>Say hello — this is the start of your conversation.</Text>
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
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" onPress={() => setReplyTo(null)} hitSlop={8}>
            <AppIcon icon={Cancel01Icon} color={colors.textSecondary} size={18} />
          </Pressable>
        </View>
      ) : null}

      {attachmentBusy ? (
        <View style={styles.replyBanner}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.replyBannerLabel}>
            {attachmentBusy === '📷 Photo' ? 'Sending photo…' : 'Sending voice note…'}
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
          style={[styles.sendButton, { backgroundColor: colors.accent, opacity: !body.trim() || sending ? 0.5 : 1 }]}
        >
          {sending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <AppIcon icon={SentIcon} color={colors.onAccent} size={20} />}
        </Pressable>
      </View>

      {attachmentSheetOpen ? (
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => (recordingActive ? undefined : setAttachmentSheetOpen(false))} />
          <View style={styles.sheet}>
            {recordingActive ? (
              <>
                <Text style={styles.sheetTitle}>
                  Recording… {Math.min(120, Math.round((recorderState.durationMillis ?? 0) / 1000))}s / 120s
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void stopVoiceNote();
                  }}
                  style={[styles.sheetAction, { backgroundColor: colors.error }]}
                >
                  <AppIcon icon={StopCircleIcon} color={colors.onAccent} size={20} />
                  <Text style={[styles.sheetActionLabel, { color: colors.onAccent }]}>Stop and send</Text>
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
                  <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>Cancel</Text>
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
            <Pressable accessibilityRole="button" onPress={() => openReply(selectedMessage)} style={styles.sheetAction}>
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
                    { text: 'Delete', style: 'destructive', onPress: () => void deleteMessage(target) },
                  ]);
                }}
                style={styles.sheetAction}
              >
                <Text style={[styles.sheetActionLabel, { color: colors.error }]}>Delete message</Text>
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
                <Text style={[styles.sheetActionLabel, { color: colors.error }]}>Report message</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedMessage(null)}
              style={[styles.sheetAction, styles.sheetCancel]}
            >
              <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles({ colors, radius, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
    headerSpacer: { width: 22 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    emptyCopy: { color: colors.textSecondary, textAlign: 'center', fontSize: typography.body.fontSize },
    error: { color: colors.error, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    notice: { color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, fontSize: typography.caption.fontSize },
    list: { padding: spacing.lg, gap: spacing.sm },
    loadMore: { alignItems: 'center', paddingVertical: spacing.md },
    loadMoreLabel: { color: colors.accent, fontWeight: '700', fontSize: typography.caption.fontSize },
    messageRow: { gap: 4, maxWidth: '84%' },
    messageRowSelf: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    messageRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
    bubbleText: { fontSize: typography.body.fontSize, lineHeight: 21 },
    replyStrip: { borderLeftWidth: 3, paddingLeft: spacing.sm, marginBottom: 4 },
    replyStripText: { fontSize: typography.caption.fontSize, fontStyle: 'italic' },
    attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    attachmentLabel: { fontSize: typography.caption.fontSize, fontWeight: '600' },
    warning: { fontSize: typography.micro.fontSize, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, alignSelf: 'flex-end' },
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
    replyBannerLabel: { fontSize: typography.caption.fontSize, fontWeight: '700', color: colors.accentAlt },
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
    sheetTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
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
    sheetActionLabel: { fontSize: typography.bodyMedium.fontSize, fontWeight: '600', color: colors.textPrimary },
    reactionPickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.sm,
    },
    reactionPickerEmoji: { fontSize: 30 },
  });
}
