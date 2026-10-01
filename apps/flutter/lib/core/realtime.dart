import 'package:socket_io_client/socket_io_client.dart' as io;

import '../features/chat/chat_message.dart';
import '../features/inbox/conversation_summary.dart';

/// Realtime seam for the inbox. The production implementation wraps
/// socket.io; tests substitute a fake. Mirrors apps/mobile/src/realtime.ts:
///
/// - single shared connection to `<origin>/communications`
/// - bearer token auth, websocket transport, reconnection on
/// - per-conversation room join/leave
abstract class InboxRealtime {
  Future<void> joinRoom(String conversationId);
  Future<void> leaveRoom(String conversationId);
  Future<void> onMessageNew(void Function(IncomingMessage message) handler);
  Future<void> offMessageNew();
  void dispose();
}

/// Socket.io implementation of [InboxRealtime].
class RealtimeService implements InboxRealtime {
  RealtimeService({
    required Future<String?> Function() getAccessToken,
    required String apiUrl,
  })  : _getAccessToken = getAccessToken,
        _apiUrl = apiUrl;

  final Future<String?> Function() _getAccessToken;
  final String _apiUrl;

  io.Socket? _socket;
  Future<io.Socket>? _connecting;
  void Function(IncomingMessage)? _messageHandler;

  /// conversations.controller.ts serves the gateway under this namespace;
  /// the origin is the API URL with the versioned path stripped.
  String get namespace {
    final origin = _apiUrl.replaceFirst(RegExp(r'/api/v\d+/?$'), '');
    return '$origin/communications';
  }

  Future<io.Socket> _socketInstance() {
    final current = _socket;
    if (current != null && current.connected) return Future.value(current);
    final pending = _connecting;
    if (pending != null) return pending;
    final future = () async {
      final token = await _getAccessToken();
      final instance = io.io(
        namespace,
        io.OptionBuilder()
            .setAuth({'token': token})
            .setTransports(['websocket'])
            .enableReconnection()
            .build(),
      );
      _socket = instance;
      final handler = _messageHandler;
      if (handler != null) {
        instance.on(
          'message.new',
          (dynamic data) => handler(
            IncomingMessage.fromJson(
              data is Map<String, dynamic> ? data : const {},
            ),
          ),
        );
      }
      return instance;
    }();
    _connecting = future;
    future.whenComplete(() => _connecting = null);
    return future;
  }

  @override
  Future<void> joinRoom(String conversationId) async {
    final socket = await _socketInstance();
    socket.emit('conversation.join', {'conversationId': conversationId});
  }

  @override
  Future<void> leaveRoom(String conversationId) async {
    final socket = await _socketInstance();
    socket.emit('conversation.leave', {'conversationId': conversationId});
  }

  @override
  Future<void> onMessageNew(
    void Function(IncomingMessage message) handler,
  ) async {
    _messageHandler = handler;
    final socket = await _socketInstance();
    socket.off('message.new');
    socket.on(
      'message.new',
      (dynamic data) => handler(
        IncomingMessage.fromJson(
          data is Map<String, dynamic> ? data : const {},
        ),
      ),
    );
  }

  @override
  Future<void> offMessageNew() async {
    _messageHandler = null;
    final socket = _socket;
    socket?.off('message.new');
  }

  @override
  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}

/// Chat-room realtime surface. Mirrors the socket usage in
/// conversation/[id].tsx: message + receipt + reaction events, typing and
/// presence in both directions, and the `message.send` emit used when the
/// socket is connected (the server fans the message back out as
/// `message.new`).
abstract class ChatRealtime {
  Future<bool> get isConnected;
  Future<void> joinRoom(String conversationId);
  Future<void> leaveRoom(String conversationId);
  Future<void> sendMessage({
    required String conversationId,
    required String body,
    String? replyToMessageId,
  });
  Future<void> setTyping(String conversationId, bool active);
  Future<void> setPresence(String state);
  Future<void> onMessageNew(void Function(ChatMessage message) handler);
  Future<void> onReaction(
    void Function(String messageId, String userId, String reaction) handler,
  );
  Future<void> onReceipt(
    String event,
    void Function(String messageId, String userId) handler,
  );
  Future<void> onTyping(
    void Function(String conversationId, bool active, String userId) handler,
  );
  Future<void> onPresence(
    void Function(String userId, String state) handler,
  );
  Future<void> offChatEvents();
}

/// Socket.io implementation of [ChatRealtime], sharing the connection style
/// of [RealtimeService].
class ChatRealtimeService implements ChatRealtime {
  ChatRealtimeService({
    required Future<String?> Function() getAccessToken,
    required String apiUrl,
  })  : _getAccessToken = getAccessToken,
        _apiUrl = apiUrl;

  final Future<String?> Function() _getAccessToken;
  final String _apiUrl;

  io.Socket? _socket;
  Future<io.Socket>? _connecting;

  String get _namespace {
    final origin = _apiUrl.replaceFirst(RegExp(r'/api/v\d+/?$'), '');
    return '$origin/communications';
  }

  Future<io.Socket> _instance() {
    final current = _socket;
    if (current != null && current.connected) return Future.value(current);
    final pending = _connecting;
    if (pending != null) return pending;
    final future = () async {
      final token = await _getAccessToken();
      final instance = io.io(
        _namespace,
        io.OptionBuilder()
            .setAuth({'token': token})
            .setTransports(['websocket'])
            .enableReconnection()
            .build(),
      );
      _socket = instance;
      return instance;
    }();
    _connecting = future;
    future.whenComplete(() => _connecting = null);
    return future;
  }

  static Map<String, dynamic> _map(dynamic data) {
    return data is Map<String, dynamic> ? data : const {};
  }

  static String _string(Map<String, dynamic> map, String key) {
    final value = map[key];
    return value is String ? value : '';
  }

  @override
  Future<bool> get isConnected async => _socket?.connected ?? false;

  @override
  Future<void> joinRoom(String conversationId) async {
    final socket = await _instance();
    socket.emit('conversation.join', {'conversationId': conversationId});
  }

  @override
  Future<void> leaveRoom(String conversationId) async {
    final socket = await _instance();
    socket.emit('conversation.leave', {'conversationId': conversationId});
  }

  @override
  Future<void> sendMessage({
    required String conversationId,
    required String body,
    String? replyToMessageId,
  }) async {
    final socket = await _instance();
    socket.emit('message.send', {
      'conversationId': conversationId,
      'body': body,
      if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
    });
  }

  @override
  Future<void> setTyping(String conversationId, bool active) async {
    final socket = await _instance();
    socket.emit('conversation.typing', {
      'conversationId': conversationId,
      'active': active,
    });
  }

  @override
  Future<void> setPresence(String state) async {
    final socket = await _instance();
    socket.emit('presence.update', {'state': state});
  }

  @override
  Future<void> onMessageNew(
    void Function(ChatMessage message) handler,
  ) async {
    final socket = await _instance();
    socket.off('message.new');
    socket.on(
      'message.new',
      (dynamic data) => handler(ChatMessage.fromJson(_map(data))),
    );
  }

  @override
  Future<void> onReaction(
    void Function(String messageId, String userId, String reaction) handler,
  ) async {
    final socket = await _instance();
    socket.off('message.reaction');
    socket.on('message.reaction', (dynamic data) {
      final map = _map(data);
      handler(
        _string(map, 'messageId'),
        _string(map, 'userId'),
        _string(map, 'reaction'),
      );
    });
  }

  @override
  Future<void> onReceipt(
    String event,
    void Function(String messageId, String userId) handler,
  ) async {
    final socket = await _instance();
    socket.off(event);
    socket.on(event, (dynamic data) {
      final map = _map(data);
      handler(_string(map, 'messageId'), _string(map, 'userId'));
    });
  }

  @override
  Future<void> onTyping(
    void Function(String conversationId, bool active, String userId) handler,
  ) async {
    final socket = await _instance();
    socket.off('conversation.typing');
    socket.on('conversation.typing', (dynamic data) {
      final map = _map(data);
      handler(
        _string(map, 'conversationId'),
        map['active'] == true,
        _string(map, 'userId'),
      );
    });
  }

  @override
  Future<void> onPresence(
    void Function(String userId, String state) handler,
  ) async {
    final socket = await _instance();
    socket.off('presence.update');
    socket.on('presence.update', (dynamic data) {
      final map = _map(data);
      handler(_string(map, 'userId'), _string(map, 'state'));
    });
  }

  @override
  Future<void> offChatEvents() async {
    _socket?.off('message.new');
    _socket?.off('message.reaction');
    _socket?.off('message.read');
    _socket?.off('message.delivered');
    _socket?.off('conversation.typing');
    _socket?.off('presence.update');
  }
}
