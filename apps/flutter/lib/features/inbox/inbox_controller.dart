import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/realtime.dart';
import '../auth/session_provider.dart';
import 'conversation_summary.dart';
import 'conversations_repository.dart';
import 'inbox_state.dart';

/// Inbox list state. Ports the load/refresh/live-update logic from
/// apps/mobile/app/(tabs)/messages.tsx:
///
/// - GET /conversations for the list, silent refresh on pull
/// - joins every conversation room while attached
/// - `message.new` updates the row preview in place, bumps unread only for
///   messages from the other user, and moves the row to the top
class InboxController extends ChangeNotifier {
  InboxController(this._repository);

  final ConversationsRepository _repository;

  InboxState _state = const InboxState();
  bool _loading = true;
  String? _error;
  InboxRealtime? _realtime;
  final Set<String> _joined = {};

  List<ConversationSummary> get items => _state.items;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load({bool silent = false}) async {
    if (!silent) _loading = true;
    _error = null;
    if (!silent) notifyListeners();
    try {
      _state = InboxState(await _repository.fetchInbox());
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadMessages';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> attachRealtime(InboxRealtime realtime) async {
    _realtime = realtime;
    for (final item in _state.items) {
      if (_joined.add(item.id)) {
        await realtime.joinRoom(item.id);
      }
    }
    await realtime.onMessageNew(applyIncomingMessage);
  }

  Future<void> detachRealtime() async {
    final realtime = _realtime;
    _realtime = null;
    if (realtime == null) return;
    await realtime.offMessageNew();
    for (final id in _joined) {
      await realtime.leaveRoom(id);
    }
    _joined.clear();
  }

  /// In-place row update for an incoming socket message. Delegates to
  /// the pure [InboxState] rules (unit-tested without a socket).
  void applyIncomingMessage(IncomingMessage message) {
    final next = _state.applyMessage(message);
    if (identical(next, _state)) return;
    _state = next;
    notifyListeners();
  }
}

final conversationsRepositoryProvider =
    Provider<ConversationsRepository>((ref) {
  return ConversationsRepository(ref.watch(sessionProvider).api);
});

final inboxControllerProvider =
    ChangeNotifierProvider<InboxController>((ref) {
  return InboxController(ref.watch(conversationsRepositoryProvider));
});

/// Shared realtime connection for the inbox (and later the chat screen).
/// Kept alive across inbox attach/detach cycles; call
/// `ref.read(realtimeServiceProvider).dispose()` on logout if needed.
final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final service = RealtimeService(
    getAccessToken: () async => ref.read(sessionProvider).accessToken,
    apiUrl: AppConfig.apiUrl,
  );
  ref.onDispose(service.dispose);
  return service;
});
