import 'package:flutter/foundation.dart';

import '../../core/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session_provider.dart';
import 'candidate.dart';
import 'discovery_repository.dart';

/// Client-side discovery toggles. Port of
/// apps/mobile/src/store/discoveryFilters.ts.
class DiscoveryFiltersController extends ChangeNotifier {
  bool _recentlyActive = false;
  bool _newMembers = false;

  bool get recentlyActive => _recentlyActive;
  bool get newMembers => _newMembers;

  void setRecentlyActive(bool value) {
    if (value == _recentlyActive) return;
    _recentlyActive = value;
    notifyListeners();
  }

  void setNewMembers(bool value) {
    if (value == _newMembers) return;
    _newMembers = value;
    notifyListeners();
  }
}

class _LastAction {
  _LastAction(this.candidate, this.isLike);

  final Candidate candidate;
  final bool isLike;
}

/// Queue state machine. Ports the queue/cursor/banner/undo logic from
/// apps/mobile/app/(tabs)/discover.tsx.
class DiscoverController extends ChangeNotifier {
  DiscoverController(this._repository);

  final DiscoveryRepository _repository;

  List<Candidate> _queue = [];
  String? _nextCursor;
  bool _loading = true;
  String? _error;
  String? _banner;
  bool _busy = false;
  bool _undoing = false;
  _LastAction? _lastAction;

  /// Fired when a like produces a mutual match so the page can show the
  /// celebration. Null by default; the page assigns it.
  Future<void> Function(LikeResult result)? onMatch;

  List<Candidate> get queue => _queue;
  Candidate? get current => _queue.isEmpty ? null : _queue.first;
  bool get loading => _loading;
  String? get error => _error;
  String? get banner => _banner;
  bool get busy => _busy;
  bool get undoing => _undoing;
  bool get canUndo => _lastAction != null && !_undoing;

  bool _recentlyActive = false;
  bool _newMembers = false;

  Future<void> refresh({
    bool recentlyActive = false,
    bool newMembers = false,
  }) async {
    _recentlyActive = recentlyActive;
    _newMembers = newMembers;
    _loading = true;
    _error = null;
    _lastAction = null;
    notifyListeners();
    try {
      final page = await _repository.fetchQueue(
        recentlyActive: recentlyActive,
        newMembers: newMembers,
      );
      _queue = page.candidates;
      _nextCursor = page.nextCursor;
    } catch (e) {
      _error = _message(e, 'unableToLoad');
    } finally {
      _loading = false;
      notifyListeners();
    }
    // Top up a drained queue when the server paginates (mirrors the
    // queue.length === 0 && nextCursor effect in discover.tsx).
    if (!_loading && _queue.isEmpty && _nextCursor != null) {
      await loadMore();
    }
  }

  Future<void> loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null) return;
    try {
      final page = await _repository.fetchQueue(
        cursor: cursor,
        recentlyActive: _recentlyActive,
        newMembers: _newMembers,
      );
      _queue = [..._queue, ...page.candidates];
      _nextCursor = page.nextCursor;
      notifyListeners();
    } catch (_) {
      // Pagination failures stay silent; the current queue keeps working.
    }
  }

  void _remove(String candidateId) {
    _queue = _queue.where((c) => c.id != candidateId).toList();
  }

  Future<void> likeCurrent({bool priority = false}) async {
    final candidate = current;
    if (candidate == null || _busy) return;
    _banner = null;
    _busy = true;
    _remove(candidate.id);
    _lastAction = _LastAction(candidate, true);
    notifyListeners();
    try {
      final result = await _repository.like(candidate.id, priority: priority);
      if (result.matched) await onMatch?.call(result);
    } catch (e) {
      _error = _message(e, 'unableToLike');
    } finally {
      _busy = false;
      notifyListeners();
    }
    if (current == null) await loadMore();
  }

  Future<void> passCurrent() async {
    final candidate = current;
    if (candidate == null || _busy) return;
    _banner = null;
    _busy = true;
    _remove(candidate.id);
    _lastAction = _LastAction(candidate, false);
    notifyListeners();
    try {
      await _repository.pass(candidate.id);
    } catch (e) {
      _error = _message(e, 'unableToPass');
    } finally {
      _busy = false;
      notifyListeners();
    }
    if (current == null) await loadMore();
  }

  Future<void> undo() async {
    final last = _lastAction;
    if (last == null || _undoing) return;
    _banner = null;
    _undoing = true;
    notifyListeners();
    try {
      await _repository.undo(last.candidate.id);
      _queue = [last.candidate, ..._queue];
      _lastAction = null;
    } catch (e) {
      final message = _message(e, 'unableToUndo');
      if (message.toLowerCase().contains('eligible plan')) {
        _banner = 'undoRequiresPlan';
      } else {
        _error = message;
      }
    } finally {
      _undoing = false;
      notifyListeners();
    }
  }

  void clearBanner() {
    _banner = null;
    notifyListeners();
  }

  // Server messages (ApiException) pass through raw; anything else falls
  // back to an i18n key. The page renders both with tr(), which returns
  // unknown keys unchanged, so raw text displays as-is.
  String _message(Object e, String fallbackKey) {
    if (e is ApiException) return e.message;
    return fallbackKey;
  }
}

final discoveryRepositoryProvider = Provider<DiscoveryRepository>((ref) {
  return DiscoveryRepository(ref.watch(sessionProvider).api);
});

final discoveryFiltersProvider =
    ChangeNotifierProvider<DiscoveryFiltersController>((ref) {
  return DiscoveryFiltersController();
});

final discoverControllerProvider =
    ChangeNotifierProvider<DiscoverController>((ref) {
  return DiscoverController(ref.watch(discoveryRepositoryProvider));
});
