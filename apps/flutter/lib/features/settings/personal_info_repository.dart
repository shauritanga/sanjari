import '../../core/api_client.dart';
import 'personal_info_models.dart';

/// Typed wrapper over the account calls in personal-info.tsx:
/// GET /onboarding (identity details), POST /auth/phone/request,
/// POST /auth/phone/verify, POST /auth/email/change/request, and
/// POST /auth/email/change/confirm (returns the confirmed email).
class PersonalInfoRepository {
  PersonalInfoRepository(this._api);

  final ApiClient _api;

  Future<PersonalInfo?> fetchInfo() async {
    final body = await _api.get('/onboarding');
    final data = body['data'];
    if (data is! Map<String, dynamic>) return null;
    return PersonalInfo.fromJson(data);
  }

  Future<void> requestPhoneChange(String phoneNumber) {
    return _api.post('/auth/phone/request', {'phoneNumber': phoneNumber});
  }

  Future<void> confirmPhoneChange(String phoneNumber, String code) {
    return _api.post(
      '/auth/phone/verify',
      {'phoneNumber': phoneNumber, 'code': code},
    );
  }

  Future<void> requestEmailChange(String newEmail) {
    return _api.post('/auth/email/change/request', {'newEmail': newEmail});
  }

  /// Returns the confirmed email, or throws when the response has none —
  /// mirroring the guarded setInfo in confirmEmailChange().
  Future<String> confirmEmailChange(String newEmail, String code) async {
    final body = await _api.post('/auth/email/change/confirm', {
      'newEmail': newEmail,
      'code': code,
    });
    final data = body['data'];
    final email =
        data is Map<String, dynamic> ? data['email'] as String? : null;
    if (email == null || email.isEmpty) {
      throw ApiException('That code is invalid or expired.');
    }
    return email;
  }
}
