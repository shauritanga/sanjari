import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'blocked_models.dart';
import 'blocked_repository.dart';

/// Blocked list state. Ports the load/unblock logic from blocked.tsx:
/// unblock removes the row optimistically and only surfaces an error on
/// failure (the row stays gone, like Expo).
class BlockedController extends ChangeNotifier {
  BlockedController(this._repository);

  final BlockedRepository _repository;

  List<BlockedProfile> _blocked = [];
  bool _loading = true;
  String? _error;
  String? _unblockingId;

  List<BlockedProfile> get blocked => _blocked;
  bool get loading => _loading;
  String? get error => _error;
  String? get unblockingId => _unblockingId;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _blocked = await _repository.fetchBlocked();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadBlocked';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> unblock(String blockedId) async {
    _unblockingId = blockedId;
    notifyListeners();
    try {
      await _repository.unblock(blockedId);
      _blocked =
          _blocked.where((item) => item.blockedId != blockedId).toList();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToUnblock';
    } finally {
      _unblockingId = null;
      notifyListeners();
    }
  }
}

final blockedRepositoryProvider = Provider<BlockedRepository>((ref) {
  return BlockedRepository(ref.watch(sessionProvider).api);
});

final blockedControllerProvider =
    ChangeNotifierProvider<BlockedController>((ref) {
  return BlockedController(ref.watch(blockedRepositoryProvider));
});
