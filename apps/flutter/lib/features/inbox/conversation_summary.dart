import 'package:intl/intl.dart';

// Inbox domain models. Pure Dart (intl is pure Dart) so parsing and
// formatting stay unit-testable. Ports ConversationSummary/IncomingMessage
// and formatRelativeTime() from apps/mobile/app/(tabs)/messages.tsx.
class InboxOtherUser {
  const InboxOtherUser({required this.id, this.displayName});

  factory InboxOtherUser.fromJson(Map<String, dynamic> json) {
    return InboxOtherUser(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String?,
    );
  }

  final String id;
  final String? displayName;
}

class InboxLastMessage {
  const InboxLastMessage({
    required this.id,
    this.body,
    required this.senderId,
    required this.createdAt,
    required this.status,
  });

  factory InboxLastMessage.fromJson(Map<String, dynamic> json) {
    return InboxLastMessage(
      id: json['id'] as String? ?? '',
      body: json['body'] as String?,
      senderId: json['senderId'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      status: json['status'] as String? ?? '',
    );
  }

  final String id;
  final String? body;
  final String senderId;
  final String createdAt;
  final String status;
}

class ConversationSummary {
  const ConversationSummary({
    required this.id,
    required this.matchId,
    required this.otherUser,
    this.lastMessage,
    this.unreadCount = 0,
  });

  factory ConversationSummary.fromJson(Map<String, dynamic> json) {
    final other = json['otherUser'];
    final last = json['lastMessage'];
    return ConversationSummary(
      id: json['id'] as String? ?? '',
      matchId: json['matchId'] as String? ?? '',
      otherUser: other is Map<String, dynamic>
          ? InboxOtherUser.fromJson(other)
          : const InboxOtherUser(id: ''),
      lastMessage: last is Map<String, dynamic>
          ? InboxLastMessage.fromJson(last)
          : null,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String matchId;
  final InboxOtherUser otherUser;
  final InboxLastMessage? lastMessage;
  final int unreadCount;

  String safeName() {
    final name = (otherUser.displayName ?? '').trim();
    return name.isEmpty ? 'Sanjari member' : name;
  }

  ConversationSummary copyWith({
    InboxLastMessage? lastMessage,
    int? unreadCount,
  }) {
    return ConversationSummary(
      id: id,
      matchId: matchId,
      otherUser: otherUser,
      lastMessage: lastMessage ?? this.lastMessage,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}

class IncomingMessage {
  const IncomingMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.body,
    required this.status,
    required this.createdAt,
  });

  factory IncomingMessage.fromJson(Map<String, dynamic> json) {
    return IncomingMessage(
      id: json['id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      body: json['body'] as String?,
      status: json['status'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String id;
  final String conversationId;
  final String senderId;
  final String? body;
  final String status;
  final String createdAt;
}

/// Port of formatRelativeTime(). `now` is injectable for tests; dates older
/// than a week fall back to a locale-aware "MMM d" via intl (Expo uses
/// toLocaleDateString with month short + day numeric).
String formatRelativeTime(DateTime date, DateTime now, {String? justNow}) {
  final diffMinutes = now.difference(date).inMinutes;
  if (diffMinutes < 1) return justNow ?? 'Just now';
  if (diffMinutes < 60) return '${diffMinutes}m';
  final diffHours = now.difference(date).inHours;
  if (diffHours < 24) return '${diffHours}h';
  final diffDays = now.difference(date).inDays;
  if (diffDays < 7) return '${diffDays}d';
  return DateFormat.MMMd().format(date);
}
