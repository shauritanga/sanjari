import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/inbox/conversation_summary.dart';
import 'package:sanjari/features/inbox/conversations_repository.dart';
import 'package:sanjari/features/inbox/inbox_state.dart';

import 'mock_api.dart';

void main() {
  group('ConversationSummary.fromJson', () {
    test('parses a row with last message and unread count', () {
      final summary = ConversationSummary.fromJson({
        'id': 'conv-1',
        'matchId': 'match-1',
        'otherUser': {'id': 'user-3', 'displayName': 'Neema'},
        'lastMessage': {
          'id': 'msg-1',
          'body': 'Habari!',
          'senderId': 'user-3',
          'createdAt': '2026-09-10T10:00:00.000Z',
          'status': 'sent',
        },
        'unreadCount': 2,
      });

      expect(summary.safeName(), 'Neema');
      expect(summary.lastMessage?.body, 'Habari!');
      expect(summary.unreadCount, 2);
    });

    test('a fresh match has no preview', () {
      final summary = ConversationSummary.fromJson({
        'id': 'conv-2',
        'matchId': 'match-2',
        'otherUser': {'id': 'user-4', 'displayName': null},
        'lastMessage': null,
      });

      expect(summary.safeName(), 'Sanjari member');
      expect(summary.lastMessage, isNull);
      expect(summary.unreadCount, 0);
    });
  });

  group('formatRelativeTime', () {
    test('covers every bucket', () {
      final now = DateTime.utc(2026, 9, 10, 12);
      expect(
        formatRelativeTime(now.subtract(const Duration(seconds: 30)), now),
        'Just now',
      );
      expect(
        formatRelativeTime(now.subtract(const Duration(minutes: 5)), now),
        '5m',
      );
      expect(
        formatRelativeTime(now.subtract(const Duration(hours: 3)), now),
        '3h',
      );
      expect(
        formatRelativeTime(now.subtract(const Duration(days: 2)), now),
        '2d',
      );
      expect(
        formatRelativeTime(now.subtract(const Duration(days: 9)), now),
        isNotEmpty,
      );
    });
  });

  group('InboxState live updates', () {
    InboxState twoRows() {
      return InboxState([
        ConversationSummary.fromJson({
          'id': 'conv-1',
          'matchId': 'm1',
          'otherUser': {'id': 'u1', 'displayName': 'A'},
        }),
        ConversationSummary.fromJson({
          'id': 'conv-2',
          'matchId': 'm2',
          'otherUser': {'id': 'u2', 'displayName': 'B'},
        }),
      ]);
    }

    test('other-user message bumps unread and moves row to top', () {
      final next = twoRows().applyMessage(
        const IncomingMessage(
          id: 'msg-9',
          conversationId: 'conv-2',
          senderId: 'u2',
          body: 'Hey',
          status: 'sent',
          createdAt: '2026-09-10T12:00:00.000Z',
        ),
      );

      expect(next.items.first.id, 'conv-2');
      expect(next.items.first.unreadCount, 1);
      expect(next.items.first.lastMessage?.body, 'Hey');
    });

    test('own message refreshes preview without bumping unread', () {
      final state = InboxState([
        ConversationSummary.fromJson({
          'id': 'conv-1',
          'matchId': 'm1',
          'otherUser': {'id': 'u1', 'displayName': 'A'},
          'unreadCount': 2,
        }),
      ]);

      final next = state.applyMessage(
        const IncomingMessage(
          id: 'msg-9',
          conversationId: 'conv-1',
          senderId: 'me',
          body: 'Hi back',
          status: 'sent',
          createdAt: '2026-09-10T12:00:00.000Z',
        ),
      );

      expect(next.items.first.unreadCount, 2);
      expect(next.items.first.lastMessage?.body, 'Hi back');
    });

    test('messages for unknown conversations leave state untouched', () {
      const state = InboxState();

      final next = state.applyMessage(
        const IncomingMessage(
          id: 'msg-9',
          conversationId: 'conv-unknown',
          senderId: 'u9',
          status: 'sent',
          createdAt: '2026-09-10T12:00:00.000Z',
        ),
      );

      expect(identical(next, state), isTrue);
    });
  });

  group('ConversationsRepository', () {
    test('fetchInbox hits the conversations endpoint', () async {
      final seen = <RequestOptions>[];
      final repo = ConversationsRepository(
        mockApi(
          (_) => {
            'data': [
              {
                'id': 'conv-1',
                'matchId': 'm1',
                'otherUser': {'id': 'u1', 'displayName': 'A'},
                'unreadCount': 1,
              },
            ],
          },
          seen: seen,
        ),
      );

      final items = await repo.fetchInbox();

      expect(items.single.safeName(), 'A');
      expect(items.single.unreadCount, 1);
      expect(seen.single.path, endsWith('/conversations'));
    });
  });
}
