import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/chat/chat_message.dart';
import 'package:sanjari/features/chat/chat_repository.dart';

import 'mock_api.dart';

ChatMessage textMessage({
  String id = 'msg-1',
  String senderId = 'u1',
  String? body = 'Hello',
  List<MsgReceipt> receipts = const [],
  List<MsgReaction> reactions = const [],
  String? replyToMessageId,
}) {
  return ChatMessage(
    id: id,
    conversationId: 'conv-1',
    senderId: senderId,
    body: body,
    status: 'sent',
    createdAt: '2026-09-10T12:00:00.000Z',
    replyToMessageId: replyToMessageId,
    receipts: receipts,
    reactions: reactions,
  );
}

void main() {
  group('ChatMessage', () {
    test('parses body, reply, reactions, and receipts', () {
      final message = ChatMessage.fromJson({
        'id': 'msg-1',
        'senderId': 'u1',
        'body': 'Hi',
        'status': 'sent',
        'createdAt': '2026-09-10T12:00:00.000Z',
        'replyToMessageId': 'msg-0',
        'replyTo': {'id': 'msg-0', 'senderId': 'u2', 'body': 'Hey'},
        'reactions': [
          {'userId': 'u2', 'reaction': '❤️'},
        ],
        'receipts': [
          {
            'userId': 'u2',
            'type': 'read',
            'createdAt': '2026-09-10T12:01:00.000Z',
          },
        ],
      });

      expect(message.replyTo?.body, 'Hey');
      expect(message.reactions.single.reaction, '❤️');
      expect(message.hasReceiptFrom('u2', 'read', 'u1'), isTrue);
      expect(message.hasReceiptFrom('u1', 'read', 'u1'), isFalse);
      expect(message.isDeleted, isFalse);
    });

    test('redacted messages read as deleted', () {
      final message = textMessage(body: null);

      expect(message.isDeleted, isTrue);
    });
  });

  group('receipt and reaction application', () {
    test('applyReceipt dedups identical receipts', () {
      final messages = [textMessage()];
      const stamp = '2026-09-10T12:01:00.000Z';

      final once = applyReceipt(messages, 'msg-1', 'u2', 'read', stamp);
      expect(once.single.receipts, hasLength(1));

      final twice = applyReceipt(once, 'msg-1', 'u2', 'read', stamp);
      expect(identical(twice.single, once.single), isTrue);
    });

    test('applyReaction dedups identical reactions', () {
      final messages = [textMessage()];

      final once = applyReaction(messages, 'msg-1', 'u2', '👍');
      expect(once.single.reactions.single.reaction, '👍');

      final twice = applyReaction(once, 'msg-1', 'u2', '👍');
      expect(identical(twice.single, once.single), isTrue);
    });
  });

  group('reply lookup', () {
    test('fills a missing preview from loaded messages', () {
      final target = textMessage(id: 'msg-0', senderId: 'u2', body: 'Hey');
      final reply = textMessage(
        id: 'msg-1',
        senderId: 'u1',
        replyToMessageId: 'msg-0',
      );

      final resolved = lookupReply(reply, [target, reply]);

      expect(resolved.replyTo?.body, 'Hey');
    });

    test('leaves existing previews and unknown targets alone', () {
      final withPreview = textMessage().copyWith(
        replyTo: const ReplyPreview(id: 'x', senderId: 'u2', body: 'Kept'),
      );
      expect(
        lookupReply(withPreview, []).replyTo?.body,
        'Kept',
      );

      final orphan = textMessage(id: 'msg-9', replyToMessageId: 'missing');
      expect(lookupReply(orphan, []).replyTo, isNull);
    });
  });

  group('chat formatters', () {
    test('last-seen buckets mirror the Expo labels', () {
      final now = DateTime.utc(2026, 9, 10, 12);
      expect(
        formatLastSeen(now.toIso8601String(), now),
        'Last seen just now',
      );
      expect(
        formatLastSeen(
          now.subtract(const Duration(minutes: 5)).toIso8601String(),
          now,
        ),
        'Last seen 5m ago',
      );
      expect(
        formatLastSeen(
          now.subtract(const Duration(hours: 3)).toIso8601String(),
          now,
        ),
        'Last seen 3h ago',
      );
      expect(
        formatLastSeen(
          now.subtract(const Duration(days: 2)).toIso8601String(),
          now,
        ),
        'Last seen 2d ago',
      );
      expect(formatLastSeen(null, now), isNull);
      expect(formatLastSeen('bogus', now), isNull);
    });

    test('durations render as minutes and padded seconds', () {
      expect(formatDuration(0), '0:00');
      expect(formatDuration(65), '1:05');
      expect(formatDuration(119.6), '2:00');
    });

    test('attachment placeholder bodies are detected', () {
      expect(isAttachmentPlaceholderBody('🎤 Voice note'), isTrue);
      expect(isAttachmentPlaceholderBody('📷 Photo'), isTrue);
      expect(isAttachmentPlaceholderBody('Hello'), isFalse);
      expect(isAttachmentPlaceholderBody(null), isFalse);
      expect(isImageAttachment('image/jpeg'), isTrue);
      expect(isImageAttachment('audio/m4a'), isFalse);
    });
  });

  group('ChatRepository', () {
    test('history, send, receipts, and moderation hit the endpoints', () async {
      final seen = <RequestOptions>[];
      final repo = ChatRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/messages') &&
                options.method == 'GET') {
              return {
                'data': [
                  {
                    'id': 'msg-1',
                    'senderId': 'u2',
                    'body': 'Hi',
                    'createdAt': '2026-09-10T12:00:00.000Z',
                  },
                ],
                'nextCursor': 'cursor-1',
              };
            }
            if (options.path.endsWith('/messages') &&
                options.method == 'POST') {
              return {
                'data': {
                  'id': 'msg-2',
                  'senderId': 'me',
                  'body': 'Hello',
                  'createdAt': '2026-09-10T12:01:00.000Z',
                },
              };
            }
            return {'data': null};
          },
          seen: seen,
        ),
      );

      final page = await repo.fetchHistory('conv-1');
      expect(page.messages.single.body, 'Hi');
      expect(page.nextCursor, 'cursor-1');

      final sent = await repo.sendMessage(
        'conv-1',
        'Hello',
        replyToMessageId: 'msg-1',
      );
      expect(sent?.id, 'msg-2');
      expect(
        (seen[1].data as Map)['replyToMessageId'],
        'msg-1',
      );

      await repo.markRead('conv-1', 'msg-1');
      await repo.markDelivered('conv-1', ['msg-1']);
      await repo.react('msg-1', '❤️');
      await repo.deleteMessage('msg-1');
      await repo.reportMessage(textMessage(id: 'msg-1', senderId: 'u2'));

      final paths = seen.map((r) => '${r.method} ${r.path}').toList();
      expect(paths, contains('POST /conversations/conv-1/read'));
      expect(paths, contains('POST /conversations/conv-1/delivered'));
      expect(
        paths,
        contains('POST /conversations/messages/msg-1/reactions'),
      );
      expect(paths, contains('DELETE /conversations/messages/msg-1'));
      expect(paths, contains('POST /reports'));
    });
  });
}
