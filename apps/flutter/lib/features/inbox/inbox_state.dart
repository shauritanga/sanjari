import 'conversation_summary.dart';

/// Pure-Dart inbox state: the ordered conversation list plus the in-place
/// row update for an incoming socket message. Kept free of Flutter imports
/// (same split as l10n/strings.dart) so the live-update rules stay
/// unit-testable with `dart test`; InboxController owns notifying.
///
/// Rules mirror messages.tsx handleNewMessage: update the row preview in
/// place, bump unread only for messages from the other user, and move the
/// row to the top. Unknown conversations are ignored.
class InboxState {
  const InboxState([this.items = const []]);

  final List<ConversationSummary> items;

  InboxState applyMessage(IncomingMessage message) {
    final index = items.indexWhere((c) => c.id == message.conversationId);
    if (index == -1) return this;
    final existing = items[index];
    final updated = existing.copyWith(
      lastMessage: InboxLastMessage(
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt,
        status: message.status,
      ),
      unreadCount: message.senderId == existing.otherUser.id
          ? existing.unreadCount + 1
          : existing.unreadCount,
    );
    return InboxState([
      updated,
      ...items.where((c) => c.id != message.conversationId),
    ]);
  }
}
