import '../../core/api_client.dart';
import 'premium_models.dart';

/// Typed wrapper over the premium calls in premium.tsx:
/// GET /subscriptions/plans and GET /subscriptions/status
/// (both envelopes carry their payload in `data`).
class PremiumRepository {
  PremiumRepository(this._api);

  final ApiClient _api;

  Future<List<PremiumPlan>> fetchPlans() async {
    final body = await _api.get('/subscriptions/plans');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(PremiumPlan.fromJson)
        .toList();
  }

  Future<PremiumStatus?> fetchStatus() async {
    final body = await _api.get('/subscriptions/status');
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return PremiumStatus.fromJson(data);
  }
}
