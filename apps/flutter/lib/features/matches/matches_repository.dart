import '../../core/api_client.dart';
import 'match.dart';

/// Typed wrapper over the matches endpoints used by matches.tsx:
/// GET /matches and POST /matches/:id/unmatch.
class MatchesRepository {
  MatchesRepository(this._api);

  final ApiClient _api;

  Future<List<Match>> fetchMatches() async {
    final body = await _api.get('/matches');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(Match.fromJson)
        .toList();
  }

  /// Mirrors the unmatch call in matches.tsx, including its reason string.
  Future<void> unmatch(String matchId) {
    return _api.post(
      '/matches/$matchId/unmatch',
      {'reason': 'User initiated unmatch.'},
    );
  }
}
