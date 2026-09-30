import '../../core/api_client.dart';
import 'chaperone_models.dart';

/// Typed wrapper over the chaperone calls in chaperone.tsx:
/// GET /onboarding/chaperone (null when none set),
/// PUT /onboarding/chaperone, and DELETE /onboarding/chaperone.
class ChaperoneRepository {
  ChaperoneRepository(this._api);

  final ApiClient _api;

  Future<Chaperone?> fetchChaperone() async {
    final body = await _api.get('/onboarding/chaperone');
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return Chaperone.fromJson(data);
  }

  Future<void> saveChaperone(Chaperone chaperone) {
    return _api.put('/onboarding/chaperone', chaperone.toJson());
  }

  Future<void> removeChaperone() {
    return _api.remove('/onboarding/chaperone');
  }
}
