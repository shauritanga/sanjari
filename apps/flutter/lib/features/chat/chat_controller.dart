import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/devices.dart';
import '../../core/devices_impl.dart';
import '../../core/realtime.dart';
import '../auth/session_provider.dart';
import 'chat_attachments.dart';
import 'chat_message.dart';
import 'chat_repository.dart';
import 'offline_queue.dart';

class _PendingSend {
  _PendingSend(this.replyToMessageId, this.replyTo);

  final String? replyToMessageId;
  final ReplyPreview? replyTo;
}

/// Chat screen state. Ports the logic of
/// apps/mobile/app/conversation/[id].tsx:
///
/// - newest-first history with cursor pagination
/// - send via socket when connected, REST fallback, offline enqueue
/// - photo (up to 10) and voice-note (120s) attachments through the
///   presign → PUT → complete pipeline
/// - delivered ack + delayed read mark for incoming messages
/// - receipts, reactions, typing (4s clear), and presence handling
///
/// Live metering is unavailable (the record plugin exposes no amplitude
/// stream), so voice notes send without a waveform and render the
/// fallback bars — the same path as pre-waveform legacy messages.
class ChatController extends ChangeNotifier {
  ChatController(
    this._repository,
    this._queue, {
    required this.conversationId,
    ChatAttachmentSender? sender,
    MediaPicker? picker,
    VoiceRecorder? recorder,
    SoundPlayer? player,
  })  : _sender =
            sender ?? ChatAttachmentSender(_repository, DioBinaryUploader()),
        _picker = picker ?? PluginMediaPicker(),
        _recorder = recorder ?? RecordVoiceRecorder(),
        _player = player ?? AudioPlayersSound();

  final ChatRepository _repository;
  final OfflineMessageQueue _queue;
  final String conversationId;
  final ChatAttachmentSender _sender;
  final MediaPicker _picker;
  final VoiceRecorder _recorder;
  final SoundPlayer _player;

  ChatRealtime? _realtime;
  List<ChatMessage> _messages = [];
  String? _nextCursor;
  bool _loadingInitial = true;
  bool _loadingOlder = false;
  String? _error;
  String? _notice;
  bool _sending = false;
  bool _typingActive = false;
  bool _otherOnline = false;
  String? _otherLastActiveAt;
  String _otherUserId = '';
  String _otherUserName = '';
  String _selfId = '';
  ReplyPreview? _replyTo;

  final List<_PendingSend> _pendingSends = [];
  final Set<String> _readMarked = {};
  Timer? _typingIdle;
  Timer? _typingClear;
  final Map<String, Timer> _readDelays = {};
  bool _composerTyping = false;

  String? _attachmentBusy;
  bool _recordingVoice = false;
  int _recordingMs = 0;
  String? _playingId;
  StreamSubscription<Duration>? _recSub;
  StreamSubscription<bool>? _playSub;
  final Map<String, List<MsgAttachment>> _pendingAttachments = {};

  List<ChatMessage> get messages => _messages;
  String? get nextCursor => _nextCursor;
  bool get loadingInitial => _loadingInitial;
  bool get loadingOlder => _loadingOlder;
  String? get error => _error;
  String? get notice => _notice;
  bool get sending => _sending;
  bool get typingActive => _typingActive;
  bool get otherOnline => _otherOnline;
  String? get otherLastActiveAt => _otherLastActiveAt;
  String get otherUserName => _otherUserName;
  String get selfId => _selfId;
  ReplyPreview? get replyTo => _replyTo;
  String? get attachmentBusy => _attachmentBusy;
  bool get recordingVoice => _recordingVoice;
  int get recordingMs => _recordingMs;
  String? get playingId => _playingId;

  bool isMine(ChatMessage message) =>
      _selfId.isNotEmpty && message.senderId == _selfId;

  Future<void> attach(ChatRealtime realtime) async {
    _realtime = realtime;
    _selfId = await _repository.fetchCurrentUserId();
    notifyListeners();
    unawaited(_loadHeader());
    await loadInitial();
    await realtime.joinRoom(conversationId);
    realtime.setPresence('online');
    await _queue.drain((message) async {
      if (message.conversationId != conversationId) return;
      await _repository.sendMessage(conversationId, message.body);
    });
    await realtime.onMessageNew(_handleNewMessage);
    await realtime.onReaction(
      (messageId, userId, reaction) => _updateMessages(
        applyReaction(_messages, messageId, userId, reaction),
      ),
    );
    await realtime.onReceipt(
      'message.read',
      (messageId, userId) => _addReceipt(messageId, userId, 'read'),
    );
    await realtime.onReceipt(
      'message.delivered',
      (messageId, userId) => _addReceipt(messageId, userId, 'delivered'),
    );
    await realtime.onTyping((id, active, userId) {
      if (id != conversationId || userId == _selfId) return;
      _typingClear?.cancel();
      if (active) {
        _typingActive = true;
        notifyListeners();
        _typingClear = Timer(
          const Duration(milliseconds: 4000),
          () {
            _typingActive = false;
            notifyListeners();
          },
        );
      } else {
        _typingActive = false;
        notifyListeners();
      }
    });
    await realtime.onPresence((userId, state) {
      if (userId != _otherUserId) return;
      _otherOnline = state == 'online';
      if (!_otherOnline) {
        _otherLastActiveAt = DateTime.now().toUtc().toIso8601String();
      }
      notifyListeners();
    });
  }

  Future<void> detach() async {
    final realtime = _realtime;
    _realtime = null;
    _typingIdle?.cancel();
    _typingClear?.cancel();
    for (final timer in _readDelays.values) {
      timer.cancel();
    }
    _readDelays.clear();
    if (realtime == null) return;
    realtime.setPresence('offline');
    await realtime.offChatEvents();
    await realtime.leaveRoom(conversationId);
  }

  Future<void> _loadHeader() async {
    final header = await _repository.fetchHeader(conversationId);
    if (header.displayName?.isNotEmpty == true) {
      _otherUserName = header.displayName!;
    }
    _otherUserId = header.otherUserId;
    _otherOnline = header.online;
    _otherLastActiveAt = header.lastActiveAt;
    notifyListeners();
  }

  Future<void> loadInitial() async {
    _loadingInitial = true;
    _error = null;
    notifyListeners();
    try {
      final page = await _repository.fetchHistory(conversationId);
      _messages = page.messages;
      _nextCursor = page.nextCursor;
      final lastIncoming = _messages.cast<ChatMessage?>().firstWhere(
            (m) =>
                m != null &&
                m.senderId != _selfId &&
                !m.receipts.any((r) => r.userId == _selfId),
            orElse: () => null,
          );
      if (lastIncoming != null) markRead(lastIncoming.id);
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadConversation';
    } finally {
      _loadingInitial = false;
      notifyListeners();
    }
  }

  Future<void> loadOlder() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingOlder) return;
    _loadingOlder = true;
    notifyListeners();
    try {
      final page = await _repository.fetchHistory(
        conversationId,
        cursor: cursor,
      );
      _messages = [..._messages, ...page.messages];
      _nextCursor = page.nextCursor;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadEarlier';
    } finally {
      _loadingOlder = false;
      notifyListeners();
    }
  }

  void _updateMessages(List<ChatMessage> next) {
    _messages = next;
    notifyListeners();
  }

  void _addReceipt(String messageId, String userId, String type) {
    _updateMessages(
      applyReceipt(
        _messages,
        messageId,
        userId,
        type,
        DateTime.now().toUtc().toIso8601String(),
      ),
    );
  }

  void markRead(String messageId) {
    if (!_readMarked.add(messageId)) return;
    _repository.markRead(conversationId, messageId).catchError((_) {
      _readMarked.remove(messageId);
    });
  }

  void _handleNewMessage(ChatMessage message) {
    if (message.conversationId != null &&
        message.conversationId!.isNotEmpty &&
        message.conversationId != conversationId) {
      return;
    }
    if (_messages.any((entry) => entry.id == message.id)) return;
    var next = message;
    if (message.senderId == _selfId) {
      final index = _pendingSends.indexWhere(
        (p) => (p.replyToMessageId) == (message.replyToMessageId),
      );
      if (index != -1) {
        final pending = _pendingSends.removeAt(index);
        if (pending.replyTo != null)
          next = next.copyWith(replyTo: pending.replyTo);
      }
    }
    next = lookupReply(next, _messages);
    _messages = [next, ..._messages];
    notifyListeners();
    if (message.senderId != _selfId) {
      _repository
          .markDelivered(conversationId, [message.id]).catchError((_) {});
      _readDelays[message.id]?.cancel();
      _readDelays[message.id] = Timer(
        const Duration(milliseconds: 400),
        () {
          _readDelays.remove(message.id);
          markRead(message.id);
        },
      );
    }
  }

  void onComposerChanged(String text) {
    final realtime = _realtime;
    if (text.isEmpty) {
      _stopTyping(realtime);
      return;
    }
    if (!_composerTyping) {
      _composerTyping = true;
      realtime?.setTyping(conversationId, true);
    }
    _typingIdle?.cancel();
    _typingIdle = Timer(
      const Duration(milliseconds: 3000),
      () => _stopTyping(realtime),
    );
  }

  void _stopTyping(ChatRealtime? realtime) {
    _typingIdle?.cancel();
    if (_composerTyping) {
      _composerTyping = false;
      realtime?.setTyping(conversationId, false);
    }
  }

  void setReplyTo(ReplyPreview? reply) {
    _replyTo = reply;
    notifyListeners();
  }

  Future<void> send(String text) async {
    final body = text.trim();
    if (body.isEmpty || _sending) return;
    _sending = true;
    _error = null;
    _stopTyping(_realtime);
    notifyListeners();
    final replyToMessageId = _replyTo?.id;
    final replyPreview = _replyTo;
    try {
      final realtime = _realtime;
      if (realtime != null && await realtime.isConnected) {
        _pendingSends.add(_PendingSend(replyToMessageId, replyPreview));
        await realtime.sendMessage(
          conversationId: conversationId,
          body: body,
          replyToMessageId: replyToMessageId,
        );
        _replyTo = null;
        return;
      }
      final sent = await _repository.sendMessage(
        conversationId,
        body,
        replyToMessageId: replyToMessageId,
      );
      if (sent != null) {
        var withReply = sent;
        if (replyToMessageId != null && replyPreview != null) {
          withReply = sent.copyWith(replyTo: replyPreview);
        }
        if (!_messages.any((entry) => entry.id == withReply.id)) {
          _messages = [withReply, ..._messages];
        }
      }
      _replyTo = null;
    } catch (_) {
      await _queue.enqueue(conversationId, body);
      _notice = 'messageQueued';
      _replyTo = null;
    } finally {
      _sending = false;
      notifyListeners();
    }
  }

  void clearNotice() {
    _notice = null;
    notifyListeners();
  }

  void _mergeAttachment(String messageId, MsgAttachment attachment) {
    final index = _messages.indexWhere((entry) => entry.id == messageId);
    if (index == -1) {
      _pendingAttachments.putIfAbsent(messageId, () => []).add(attachment);
      return;
    }
    final entry = _messages[index];
    _messages = [
      ..._messages.sublist(0, index),
      entry.copyWith(
        attachments: [...entry.attachments, attachment],
      ),
      ..._messages.sublist(index + 1),
    ];
    notifyListeners();
  }

  /// Opens the OS app settings so the user can re-grant a denied
  /// photo-library gate from the denial dialog.
  Future<void> openSettings() => _picker.openSettings();

  /// Photo flow: permission gate, multi-pick (max 10), then the sequential
  /// pipeline. Denial throws [DeviceDenied] so the page can show the
  /// settings guidance; cancellation returns silently.
  Future<void> sendPhotosFlow() async {
    if (!await _picker.ensureGalleryAccess()) {
      throw DeviceDenied('Allow photo library access to send photos.');
    }
    final picked = await _picker.pickImages(limit: maxPhotosPerMessage);
    if (picked.isEmpty) return;
    await sendFiles(
      [
        for (final media in picked)
          OutgoingAttachment(
            bytes: media.bytes,
            mimeType: media.mimeType,
            sizeBytes: media.sizeBytes,
          ),
      ],
      photoPlaceholder(picked.length),
    );
  }

  Future<void> sendFiles(
    List<OutgoingAttachment> files,
    String placeholder,
  ) async {
    _attachmentBusy = placeholder;
    _error = null;
    notifyListeners();
    try {
      final created = await _sender.send(
        conversationId: conversationId,
        placeholderBody: placeholder,
        files: files,
        onAttachment: _mergeAttachment,
        replyToMessageId: _replyTo?.id,
      );
      // Safety net: the socket usually broadcasts the parent first, but if
      // it hasn't landed locally yet, append it with any stashed parts.
      if (created != null &&
          !_messages.any((entry) => entry.id == created.id)) {
        final stashed = _pendingAttachments.remove(created.id) ?? const [];
        _messages = [
          created.copyWith(attachments: [...stashed]),
          ..._messages,
        ];
      }
      _pendingAttachments.removeWhere(
        (id, _) => _messages.any((entry) => entry.id == id),
      );
      _replyTo = null;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Attachment upload failed.';
    } finally {
      _attachmentBusy = null;
      notifyListeners();
    }
  }

  /// Voice flow: permission gate, record with 120s auto-stop, then upload
  /// as a '🎤 Voice note' message. No waveform is captured (no metering
  /// API) — playback renders the fallback bars.
  Future<void> startVoiceNote() async {
    try {
      if (!await _recorder.ensureMicAccess()) {
        throw DeviceDenied('Allow microphone access to send voice notes.');
      }
      _recordingVoice = true;
      _recordingMs = 0;
      notifyListeners();
      await _recSub?.cancel();
      _recSub = _recorder.progress.listen((elapsed) {
        _recordingMs = elapsed.inMilliseconds;
        if (_recordingMs >= maxVoiceNoteMs) {
          stopAndSendVoiceNote();
        } else {
          notifyListeners();
        }
      });
      await _recorder.start();
    } on DeviceDenied {
      _recordingVoice = false;
      notifyListeners();
      rethrow;
    } catch (_) {
      _recordingVoice = false;
      _error = 'Unable to start recording.';
      notifyListeners();
    }
  }

  Future<void> stopAndSendVoiceNote() async {
    if (!_recordingVoice) return;
    _recordingVoice = false;
    notifyListeners();
    await _recSub?.cancel();
    try {
      final take = await _recorder.stop();
      final file = await voiceFileAttachment(
        take.path,
        take.durationMs / 1000,
      );
      await sendFiles([file], voicePlaceholder);
    } on EmptyRecording {
      _error = 'Recording did not save. Please try again.';
      notifyListeners();
    } catch (_) {
      _error = 'Unable to send this voice note.';
      notifyListeners();
    }
  }

  void cancelVoiceNote() {
    _recordingVoice = false;
    _recSub?.cancel();
    notifyListeners();
  }

  Future<void> toggleVoice(MsgAttachment attachment) async {
    if (_playingId == attachment.id) {
      await _player.pause();
      return;
    }
    await _playSub?.cancel();
    _playSub = _player.playing.listen((playing) {
      _playingId = playing ? attachment.id : null;
      notifyListeners();
    });
    await _player.play(attachment.url);
  }

  @override
  void dispose() {
    _recSub?.cancel();
    _playSub?.cancel();
    super.dispose();
  }

  Future<void> reactTo(ChatMessage message, String reaction) async {
    try {
      await _repository.react(message.id, reaction);
      if (_selfId.isNotEmpty) {
        _updateMessages(
          applyReaction(_messages, message.id, _selfId, reaction),
        );
      }
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToReact';
      notifyListeners();
    }
  }

  Future<void> delete(ChatMessage message) async {
    try {
      await _repository.deleteMessage(message.id);
      _updateMessages(
        _messages
            .map(
              (entry) => entry.id == message.id
                  ? entry.copyWith(clearBody: true, attachments: const [])
                  : entry,
            )
            .toList(),
      );
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToDeleteMessage';
      notifyListeners();
    }
  }

  Future<void> report(ChatMessage message) async {
    try {
      await _repository.reportMessage(message);
      _notice = 'reportSubmitted';
      notifyListeners();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToReport';
      notifyListeners();
    }
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(sessionProvider).api);
});

final offlineQueueProvider = Provider<OfflineMessageQueue>((ref) {
  return OfflineMessageQueue();
});

final chatRealtimeProvider = Provider<ChatRealtime>((ref) {
  final service = ChatRealtimeService(
    getAccessToken: () async => ref.read(sessionProvider).accessToken,
    apiUrl: AppConfig.apiUrl,
  );
  return service;
});

final chatControllerProvider =
    ChangeNotifierProvider.family<ChatController, String>((ref, id) {
  return ChatController(
    ref.watch(chatRepositoryProvider),
    ref.watch(offlineQueueProvider),
    conversationId: id,
  );
});
