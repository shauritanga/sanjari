import 'package:intl/intl.dart';

// Chat domain models and pure message-list helpers. Pure Dart (intl is pure
// Dart) so parsing, receipts, reactions, reply lookup, and formatting stay
// unit-testable. Ports the ChatMessage interfaces and helpers from
// apps/mobile/app/conversation/[id].tsx.
class ReplyPreview {
  const ReplyPreview({required this.id, required this.senderId, this.body});

  factory ReplyPreview.fromJson(Map<String, dynamic> json) {
    return ReplyPreview(
      id: json['id'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      body: json['body'] as String?,
    );
  }

  Map<String, dynamic> toJson() =>
      {'id': id, 'senderId': senderId, 'body': body};

  final String id;
  final String senderId;
  final String? body;
}

class MsgReaction {
  const MsgReaction({required this.userId, required this.reaction});

  factory MsgReaction.fromJson(Map<String, dynamic> json) {
    return MsgReaction(
      userId: json['userId'] as String? ?? '',
      reaction: json['reaction'] as String? ?? '',
    );
  }

  final String userId;
  final String reaction;
}

class MsgReceipt {
  const MsgReceipt({
    required this.userId,
    required this.type,
    required this.createdAt,
  });

  factory MsgReceipt.fromJson(Map<String, dynamic> json) {
    return MsgReceipt(
      userId: json['userId'] as String? ?? '',
      type: json['type'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String userId;
  final String type;
  final String createdAt;
}

class MsgAttachment {
  const MsgAttachment({
    required this.id,
    required this.mimeType,
    required this.sizeBytes,
    required this.url,
    this.waveform,
    this.durationSeconds,
  });

  factory MsgAttachment.fromJson(Map<String, dynamic> json) {
    final waveform = json['waveform'];
    return MsgAttachment(
      id: json['id'] as String? ?? '',
      mimeType: json['mimeType'] as String? ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      url: json['url'] as String? ?? '',
      waveform: waveform is List
          ? waveform.whereType<num>().map((n) => n.toDouble()).toList()
          : null,
      durationSeconds: (json['durationSeconds'] as num?)?.toDouble(),
    );
  }

  final String id;
  final String mimeType;
  final int sizeBytes;
  final String url;
  final List<double>? waveform;
  final double? durationSeconds;
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    this.conversationId,
    required this.senderId,
    this.body,
    this.status = '',
    required this.createdAt,
    this.replyToMessageId,
    this.replyTo,
    this.attachments = const [],
    this.reactions = const [],
    this.receipts = const [],
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final replyTo = json['replyTo'];
    final attachments = json['attachments'];
    final reactions = json['reactions'];
    final receipts = json['receipts'];
    return ChatMessage(
      id: json['id'] as String? ?? '',
      conversationId: json['conversationId'] as String?,
      senderId: json['senderId'] as String? ?? '',
      body: json['body'] as String?,
      status: json['status'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      replyToMessageId: json['replyToMessageId'] as String?,
      replyTo: replyTo is Map<String, dynamic>
          ? ReplyPreview.fromJson(replyTo)
          : null,
      attachments: attachments is List
          ? attachments
              .whereType<Map<String, dynamic>>()
              .map(MsgAttachment.fromJson)
              .toList()
          : const [],
      reactions: reactions is List
          ? reactions
              .whereType<Map<String, dynamic>>()
              .map(MsgReaction.fromJson)
              .toList()
          : const [],
      receipts: receipts is List
          ? receipts
              .whereType<Map<String, dynamic>>()
              .map(MsgReceipt.fromJson)
              .toList()
          : const [],
    );
  }

  final String id;
  final String? conversationId;
  final String senderId;
  final String? body;
  final String status;
  final String createdAt;
  final String? replyToMessageId;
  final ReplyPreview? replyTo;
  final List<MsgAttachment> attachments;
  final List<MsgReaction> reactions;
  final List<MsgReceipt> receipts;

  bool get isDeleted => body == null && attachments.isEmpty;

  bool hasReceiptFrom(String userId, String type, String selfId) {
    return receipts.any(
      (r) => r.userId == userId && r.type == type && r.userId != selfId,
    );
  }

  ChatMessage copyWith({
    String? body,
    bool clearBody = false,
    ReplyPreview? replyTo,
    List<MsgAttachment>? attachments,
    List<MsgReaction>? reactions,
    List<MsgReceipt>? receipts,
  }) {
    return ChatMessage(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      body: clearBody ? null : (body ?? this.body),
      status: status,
      createdAt: createdAt,
      replyToMessageId: replyToMessageId,
      replyTo: replyTo ?? this.replyTo,
      attachments: attachments ?? this.attachments,
      reactions: reactions ?? this.reactions,
      receipts: receipts ?? this.receipts,
    );
  }
}

/// Reaction palette. Port of REACTION_OPTIONS.
const reactionOptions = ['❤️', '😂', '😮', '😢', '👍'];

/// Adds a reaction unless the same user+reaction already exists.
/// Port of the dedup inside handleReaction/reactToMessage.
List<ChatMessage> applyReaction(
  List<ChatMessage> messages,
  String messageId,
  String userId,
  String reaction,
) {
  return messages.map((entry) {
    if (entry.id != messageId) return entry;
    if (entry.reactions.any(
      (r) => r.userId == userId && r.reaction == reaction,
    )) {
      return entry;
    }
    return entry.copyWith(
      reactions: [
        ...entry.reactions,
        MsgReaction(userId: userId, reaction: reaction),
      ],
    );
  }).toList();
}

/// Adds a receipt unless the same user+type already exists.
/// Port of addReceipt().
List<ChatMessage> applyReceipt(
  List<ChatMessage> messages,
  String messageId,
  String userId,
  String type,
  String createdAt,
) {
  return messages.map((entry) {
    if (entry.id != messageId) return entry;
    if (entry.receipts.any((r) => r.userId == userId && r.type == type)) {
      return entry;
    }
    return entry.copyWith(
      receipts: [
        ...entry.receipts,
        MsgReceipt(userId: userId, type: type, createdAt: createdAt),
      ],
    );
  }).toList();
}

/// Fills a missing reply preview from the loaded messages.
/// Port of applyReplyLookup().
ChatMessage lookupReply(ChatMessage message, List<ChatMessage> loaded) {
  if (message.replyTo != null || message.replyToMessageId == null) {
    return message;
  }
  for (final entry in loaded) {
    if (entry.id == message.replyToMessageId) {
      return message.copyWith(
        replyTo: ReplyPreview(
          id: entry.id,
          senderId: entry.senderId,
          body: entry.body,
        ),
      );
    }
  }
  return message;
}

/// Port of formatClockTime() via intl (hour numeric, minute 2-digit).
String formatClockTime(String iso) {
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return '';
  return DateFormat.jm().format(date);
}

/// Port of formatLastSeen(). `now` is injectable for tests.
String? formatLastSeen(String? iso, DateTime now) {
  if (iso == null || iso.isEmpty) return null;
  final date = DateTime.tryParse(iso);
  if (date == null) return null;
  final minutes = now.difference(date).inMinutes;
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return 'Last seen ${minutes}m ago';
  final hours = (minutes / 60).round();
  if (hours < 24) return 'Last seen ${hours}h ago';
  final days = (hours / 24).round();
  return 'Last seen ${days}d ago';
}

/// Port of formatDuration().
String formatDuration(double seconds) {
  final total = seconds < 0 ? 0 : seconds.round();
  final minutes = total ~/ 60;
  final secs = total % 60;
  return '$minutes:${secs.toString().padLeft(2, '0')}';
}

bool isImageAttachment(String mimeType) => mimeType.startsWith('image/');

/// Attachment-only messages carry a placeholder body in Expo
/// ("🎤 Voice note" / "📷 ..."); the bubble renders the attachment instead.
bool isAttachmentPlaceholderBody(String? body) {
  return body != null &&
      (body == '🎤 Voice note' || body.startsWith('📷'));
}
