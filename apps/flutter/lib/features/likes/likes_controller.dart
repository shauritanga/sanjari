import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../discover/candidate.dart';
import '../discover/discover_controller.dart';
import '../discover/discovery_repository.dart';
import 'like_received.dart';

/// Likes-received list state. Ports the load/likeBack/pass logic from
/// apps/mobile/app/(tabs)/likes.tsx.
class LikesController extends ChangeNotifier {
  LikesController(this._repository);

  final DiscoveryRepository _repository;

  List<LikeReceived> _likes = [];
  bool _loading = true;
  String? _error;
  String? _busyUserId;

  /// Fired when liking back produces a mutual match (match dialog).
  Future<void> Function(LikeResult result, LikeReceived item)? onMatch;

  List<LikeReceived> get likes => _likes;
  bool get loading => _loading;
  String? get error => _error;
  String? get busyUserId => _busyUserId;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _likes = await _repository.fetchLikesReceived();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadLikes';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> likeBack(LikeReceived item) async {
    _busyUserId = item.userId;
    _error = null;
    notifyListeners();
    try {
      final result = await _repository.like(item.userId, priority: false);
      _likes = _likes.where((e) => e.userId != item.userId).toList();
      if (result.matched) await onMatch?.call(result, item);
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLikeBack';
    } finally {
      _busyUserId = null;
      notifyListeners();
    }
  }

  Future<void> pass(LikeReceived item) async {
    _busyUserId = item.userId;
    _error = null;
    notifyListeners();
    try {
      await _repository.pass(item.userId);
      _likes = _likes.where((e) => e.userId != item.userId).toList();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToPassMember';
    } finally {
      _busyUserId = null;
      notifyListeners();
    }
  }
}

final likesControllerProvider = ChangeNotifierProvider<LikesController>((ref) {
  return LikesController(ref.watch(discoveryRepositoryProvider));
});
