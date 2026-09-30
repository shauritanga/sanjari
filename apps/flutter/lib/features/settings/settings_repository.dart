import '../../core/api_client.dart';
import 'settings_models.dart';

/// Typed wrapper over the settings hub calls in settings.tsx:
/// GET /auth/sessions, DELETE /auth/sessions/:id,
/// GET+POST /notifications/preferences, GET+PUT /onboarding/visibility-mode,
/// and POST /onboarding/share-link.
class SettingsRepository {
  SettingsRepository(this._api);

  final ApiClient _api;

  Future<List<UserSession>> fetchSessions() async {
    final body = await _api.get('/auth/sessions');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(UserSession.fromJson)
        .toList();
  }

  Future<void> revokeSession(String sessionId) {
    return _api.remove('/auth/sessions/$sessionId');
  }

  Future<List<NotificationPreference>> fetchPreferences() async {
    final body = await _api.get('/notifications/preferences');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(NotificationPreference.fromJson)
        .toList();
  }

  Future<void> setPush(String category, bool push) {
    return _api.post(
      '/notifications/preferences',
      {'category': category, 'push': push},
    );
  }

  Future<VisibilityMode> fetchVisibilityMode() async {
    final body = await _api.get('/onboarding/visibility-mode');
    final data = body['data'];
    final mode =
        data is Map<String, dynamic> ? data['mode'] as String? : null;
    return visibilityModeFrom(mode);
  }

  Future<void> setVisibilityMode(VisibilityMode mode) {
    return _api.put('/onboarding/visibility-mode', {'mode': mode.value});
  }

  /// Returns the share token, or throws when the response has none —
  /// mirroring the 'Unable to create a share link.' error in settings.tsx.
  Future<String> createShareLink() async {
    final body = await _api.post('/onboarding/share-link', {});
    final data = body['data'];
    final token =
        data is Map<String, dynamic> ? data['token'] as String? : null;
    if (token == null || token.isEmpty) {
      throw ApiException('Unable to create a share link.');
    }
    return token;
  }
}
