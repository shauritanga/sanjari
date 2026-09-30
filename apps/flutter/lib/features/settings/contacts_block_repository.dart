import '../../core/api_client.dart';

/// Typed wrapper over POST /contacts/block in
/// apps/api/src/moderation/moderation.controller.ts.
class ContactsBlockRepository {
  ContactsBlockRepository(this._api);

  final ApiClient _api;

  /// Sends SHA-256 fingerprints, returning how many Sanjari members the
  /// server blocked. A missing count reads as zero, like the Expo screen.
  Future<int> blockByHashes(List<String> hashes) async {
    final body = await _api.post('/contacts/block', {'hashes': hashes});
    final data = body['data'];
    if (data is Map<String, dynamic>) {
      return (data['blockedCount'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }
}
