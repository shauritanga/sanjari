import '../../core/api_client.dart';
import 'profile_detail.dart';

/// Typed wrapper over GET /onboarding/preview (see profile/preview.tsx).
/// Throws when the envelope has no profile, mirroring Expo's
/// 'Unable to load your preview.' error path.
class PreviewRepository {
  PreviewRepository(this._api);

  final ApiClient _api;

  Future<ProfileDetail> fetchPreview() async {
    final body = await _api.get('/onboarding/preview');
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Unable to load your preview.');
    }
    return ProfileDetail.fromJson(data);
  }
}
