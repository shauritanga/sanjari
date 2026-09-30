import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Offline outbox for chat messages. Port of
/// apps/mobile/src/offline-message-queue.ts (SecureStore-backed, capped at
/// the 50 most recent entries; drain keeps failures for the next attempt).
class QueuedChatMessage {
  const QueuedChatMessage({
    required this.conversationId,
    required this.body,
    required this.queuedAt,
  });

  factory QueuedChatMessage.fromJson(Map<String, dynamic> json) {
    return QueuedChatMessage(
      conversationId: json['conversationId'] as String? ?? '',
      body: json['body'] as String? ?? '',
      queuedAt: (json['queuedAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'conversationId': conversationId,
        'body': body,
        'queuedAt': queuedAt,
      };

  final String conversationId;
  final String body;
  final int queuedAt;
}

class OfflineMessageQueue {
  OfflineMessageQueue({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const storageKey = 'sanjari.pendingMessages';
  static const maxEntries = 50;

  final FlutterSecureStorage _storage;

  Future<List<QueuedChatMessage>> read() async {
    // Secure storage is unavailable under `dart test`; treat as empty so
    // the queue degrades gracefully wherever platform channels are missing.
    try {
      final value = await _storage.read(key: storageKey);
      if (value == null || value.isEmpty) return const [];
      final decoded = jsonDecode(value);
      if (decoded is! List) return const [];
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(QueuedChatMessage.fromJson)
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> _persist(List<QueuedChatMessage> queue) async {
    await _storage.write(
      key: storageKey,
      value: jsonEncode(queue.map((m) => m.toJson()).toList()),
    );
  }

  Future<void> enqueue(String conversationId, String body) async {
    try {
      final queue = await read();
      final next = [
        ...queue,
        QueuedChatMessage(
          conversationId: conversationId,
          body: body,
          queuedAt: DateTime.now().millisecondsSinceEpoch,
        ),
      ];
      final capped = next.length > maxEntries
          ? next.sublist(next.length - maxEntries)
          : next;
      await _persist(capped);
    } catch (_) {
      // Queueing is best-effort; a storage failure must not break sending.
    }
  }

  Future<void> drain(
    Future<void> Function(QueuedChatMessage message) send,
  ) async {
    final queue = await read();
    final remaining = <QueuedChatMessage>[];
    for (final message in queue) {
      try {
        await send(message);
      } catch (_) {
        remaining.add(message);
      }
    }
    try {
      if (remaining.isEmpty) {
        await _storage.delete(key: storageKey);
      } else {
        await _persist(remaining);
      }
    } catch (_) {
      // Best-effort persistence; delivery already happened above.
    }
  }
}
