import '../../core/api_client.dart';
import 'safety_models.dart';

/// Typed wrapper over the Safety Centre calls in safety.tsx:
/// GET /safety/guidance (locale-aware), GET /safety/appeals,
/// POST /moderation/cases/:id/appeals, POST /safety/data-export,
/// POST /safety/account-deactivation, and POST /safety/account-deletion.
class SafetyRepository {
  SafetyRepository(this._api);

  final ApiClient _api;

  Future<Guidance?> fetchGuidance(String locale) async {
    final body = await _api.get(
      '/safety/guidance?locale=${Uri.encodeComponent(locale)}',
    );
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return Guidance.fromJson(data);
  }

  Future<List<AppealCase>> fetchAppeals() async {
    final body = await _api.get('/safety/appeals');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(AppealCase.fromJson)
        .toList();
  }

  Future<void> submitAppeal(String caseId, String statement) {
    return _api.post(
      '/moderation/cases/$caseId/appeals',
      {'statement': statement},
    );
  }

  /// Returns the server status (e.g. "requested") for the confirmation line.
  Future<String> requestExport() async {
    final body = await _api.post('/safety/data-export', {});
    final data = body['data'];
    final status =
        data is Map<String, dynamic> ? data['status'] as String? : null;
    return status ?? 'requested';
  }

  Future<void> deactivate() {
    return _api.post('/safety/account-deactivation', {});
  }

  /// Returns the server status (e.g. "scheduled") for the confirmation line.
  Future<String> requestDeletion() async {
    final body = await _api.post('/safety/account-deletion', {});
    final data = body['data'];
    final status =
        data is Map<String, dynamic> ? data['status'] as String? : null;
    return status ?? 'scheduled';
  }
}
