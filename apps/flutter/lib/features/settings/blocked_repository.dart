import '../../core/api_client.dart';
import 'blocked_models.dart';

/// Typed wrapper over the blocked-list calls in blocked.tsx:
/// GET /blocks and DELETE /blocks/:blockedId.
class BlockedRepository {
  BlockedRepository(this._api);

  final ApiClient _api;

  Future<List<BlockedProfile>> fetchBlocked() async {
    final body = await _api.get('/blocks');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(BlockedProfile.fromJson)
        .toList();
  }

  Future<void> unblock(String blockedId) {
    return _api.remove('/blocks/$blockedId');
  }
}
