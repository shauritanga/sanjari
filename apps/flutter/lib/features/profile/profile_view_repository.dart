import '../../core/api_client.dart';
import 'profile_detail.dart';

/// Typed wrapper over GET /discovery/profile/:id and GET /discovery/share/:token
/// (see apps/mobile/app/profile/[id].tsx and
/// apps/mobile/app/profile/share/[token].tsx).
class ProfileViewRepository {
  ProfileViewRepository(this._api);

  final ApiClient _api;

  Future<ProfileDetail?> fetchProfile(String userId) async {
    final body = await _api.get('/discovery/profile/$userId');
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return ProfileDetail.fromJson(data);
  }

  Future<ProfileDetail?> fetchSharedProfile(String token) async {
    final body = await _api.get('/discovery/share/$token');
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return ProfileDetail.fromJson(data);
  }
}
