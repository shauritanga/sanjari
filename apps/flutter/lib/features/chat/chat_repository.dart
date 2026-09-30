import '../../core/api_client.dart';
import '../onboarding/media_repository.dart' show PresignedUpload;
import 'chat_message.dart';

/// One page of message history (newest first, like the REST response).
class MessagePage {
  const MessagePage({required this.messages, this.nextCursor});

  final List<ChatMessage> messages;
  final String? nextCursor;
}

/// Header details for the chat screen (best-effort, failures are silent).
class ChatHeader {
  const ChatHeader({
    this.displayName,
    this.otherUserId = '',
    this.online = false,
    this.lastActiveAt,
  });

  final String? displayName;
  final String otherUserId;
  final bool online;
  final String? lastActiveAt;
}

/// Typed wrapper over the messaging endpoints in
/// apps/api/src/conversations/conversations.controller.ts, mirroring every
/// call in conversation/[id].tsx.
class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  Future<MessagePage> fetchHistory(
    String conversationId, {
    String? cursor,
  }) async {
    final path = cursor == null || cursor.isEmpty
        ? '/conversations/$conversationId/messages'
        : '/conversations/$conversationId/messages?cursor=${Uri.encodeComponent(cursor)}';
    final body = await _api.get(path);
    final data = body['data'];
    final messages = data is List
        ? data
            .whereType<Map<String, dynamic>>()
            .map(ChatMessage.fromJson)
            .toList()
        : <ChatMessage>[];
    final next = body['nextCursor'];
    return MessagePage(
      messages: messages,
      nextCursor: next is String && next.isNotEmpty ? next : null,
    );
  }

  Future<ChatMessage?> sendMessage(
    String conversationId,
    String body, {
    String? replyToMessageId,
  }) async {
    final response = await _api.post(
      '/conversations/$conversationId/messages',
      {
        'body': body,
        if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
      },
    );
    final data = response['data'];
    if (data is! Map<String, dynamic>) return null;
    return ChatMessage.fromJson(data);
  }

  /// Attachment presign ticket. sizeBytes rides as a string, matching the
  /// Expo calls.
  Future<PresignedUpload> presignAttachment(
    String conversationId,
    String messageId, {
    required String mimeType,
    required int sizeBytes,
  }) async {
    final response = await _api.post(
      '/conversations/$conversationId/messages/$messageId/attachments/presign',
      {'mimeType': mimeType, 'sizeBytes': '$sizeBytes'},
    );
    final data = response['data'];
    final ticket = PresignedUpload.fromJson(
      data is Map<String, dynamic> ? data : const {},
    );
    if (!ticket.isValid) throw ApiException('Unable to prepare upload.');
    return ticket;
  }

  /// Completes one attachment upload; waveform/duration ride along only
  /// for voice notes. Null when the envelope carries no attachment.
  Future<MsgAttachment?> completeAttachment(
    String conversationId,
    String messageId, {
    required String storageKey,
    required String mimeType,
    required int sizeBytes,
    List<double>? waveform,
    double? durationSeconds,
  }) async {
    final response = await _api.post(
      '/conversations/$conversationId/messages/$messageId/attachments/complete',
      {
        'storageKey': storageKey,
        'mimeType': mimeType,
        'sizeBytes': '$sizeBytes',
        if (waveform != null && waveform.isNotEmpty) 'waveform': waveform,
        if (durationSeconds != null) 'durationSeconds': durationSeconds,
      },
    );
    final data = response['data'];
    if (data is! Map<String, dynamic>) return null;
    return MsgAttachment.fromJson(data);
  }

  Future<void> markRead(String conversationId, String messageId) {
    return _api.post(
      '/conversations/$conversationId/read',
      {'messageId': messageId},
    );
  }

  Future<void> markDelivered(
    String conversationId,
    List<String> messageIds,
  ) {
    return _api.post(
      '/conversations/$conversationId/delivered',
      {'messageIds': messageIds},
    );
  }

  Future<void> react(String messageId, String reaction) {
    return _api.post(
      '/conversations/messages/$messageId/reactions',
      {'reaction': reaction},
    );
  }

  Future<void> deleteMessage(String messageId) {
    return _api.remove('/conversations/messages/$messageId');
  }

  /// Mirrors reportMessage(): category "other", message evidence.
  Future<void> reportMessage(ChatMessage message) {
    return _api.post('/reports', {
      'reportedUserId': message.senderId,
      'category': 'other',
      'description': 'Reported from a conversation.',
      'evidence': [
        {'type': 'message', 'referenceId': message.id},
      ],
    });
  }

  /// Current user id for telling own messages apart. GET /onboarding
  /// carries it (see conversation/[id].tsx); absent callers pass ''.
  Future<String> fetchCurrentUserId() async {
    try {
      final body = await _api.get('/onboarding');
      final data = body['data'];
      final id = data is Map<String, dynamic> ? data['userId'] : null;
      return id is String ? id : '';
    } catch (_) {
      return '';
    }
  }

  /// Best-effort header: finds this conversation in GET /conversations.
  Future<ChatHeader> fetchHeader(String conversationId) async {
    try {
      final body = await _api.get('/conversations');
      final data = body['data'];
      if (data is List) {
        for (final entry in data.whereType<Map<String, dynamic>>()) {
          if (entry['id'] != conversationId) continue;
          final other = entry['otherUser'];
          if (other is Map<String, dynamic>) {
            final lastActive = other['lastActiveAt'];
            return ChatHeader(
              displayName: other['displayName'] as String?,
              otherUserId: other['id'] as String? ?? '',
              online: other['online'] == true,
              lastActiveAt: lastActive is String ? lastActive : null,
            );
          }
        }
      }
    } catch (_) {
      // Header details are advisory; failures stay silent.
    }
    return const ChatHeader();
  }
}
