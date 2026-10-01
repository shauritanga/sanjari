import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import 'api_client.dart';
import 'config.dart';

/// Authentication state. Mirrors the logged-in / logged-out routing
/// decisions in apps/mobile/app/_layout.tsx and (auth)/* screens.
enum AuthStatus { unknown, authenticated, unauthenticated }

/// Where to send the user right after login/signup, based on the
/// GET /onboarding check used by the Expo login screen.
enum PostAuthDestination { home, onboarding }

class PostAuthResult {
  PostAuthResult(this.destination, {this.onboardingStep = 1});

  final PostAuthDestination destination;
  final int onboardingStep;
}

class SessionController extends ChangeNotifier {
  SessionController({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage() {
    _api = ApiClient(
      getAccessToken: () async => _accessToken,
      refreshSession: refreshSession,
      onAuthFailure: _setUnauthenticated,
    );
  }

  static const accessTokenKey = 'sanjari.accessToken';
  static const refreshTokenKey = 'sanjari.refreshToken';
  static const deviceIdKey = 'sanjari.deviceId';

  final FlutterSecureStorage _storage;
  late final ApiClient _api;

  AuthStatus _status = AuthStatus.unknown;
  String? _accessToken;
  String? _refreshToken;
  String _startupLocation = '/onboarding/welcome';

  AuthStatus get status => _status;
  ApiClient get api => _api;

  /// The first post-splash destination. This mirrors the Expo splash route:
  /// incomplete profiles resume onboarding, while published ones open home.
  String get startupLocation => _startupLocation;

  /// Current bearer token for realtime auth. Null when logged out.
  String? get accessToken => _accessToken;

  Future<void> initialize() async {
    _accessToken = await _storage.read(key: accessTokenKey);
    _refreshToken = await _storage.read(key: refreshTokenKey);
    if (_accessToken == null || _refreshToken == null) {
      _status = AuthStatus.unauthenticated;
      _startupLocation = '/onboarding/welcome';
      notifyListeners();
      return;
    }

    _status = AuthStatus.authenticated;
    try {
      final destination = await _postAuthDestination();
      _startupLocation = destination.destination == PostAuthDestination.home
          ? '/home/discover'
          : '/onboarding?step=${destination.onboardingStep}';
    } catch (_) {
      // The Expo app falls back to the welcome screen when the startup
      // onboarding lookup is unavailable.
      _startupLocation = '/onboarding/welcome';
    }
    notifyListeners();
  }

  Future<String> _deviceId() async {
    final existing = await _storage.read(key: deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final created = const Uuid().v4();
    await _storage.write(key: deviceIdKey, value: created);
    return created;
  }

  Future<void> _storeTokens(Map<String, dynamic> data, {bool notify = true}) {
    final access = data['accessToken'] as String?;
    final refresh = data['refreshToken'] as String?;
    if (access == null || refresh == null) {
      throw ApiException('Login response was incomplete.');
    }
    return _persist(access, refresh, notify: notify);
  }

  Future<void> _persist(String access, String refresh,
      {bool notify = true}) async {
    _accessToken = access;
    _refreshToken = refresh;
    await _storage.write(key: accessTokenKey, value: access);
    await _storage.write(key: refreshTokenKey, value: refresh);
    _status = AuthStatus.authenticated;
    if (notify) notifyListeners();
  }

  Future<PostAuthResult> _postAuthDestination() async {
    final body = await _api.get('/onboarding');
    final data = body['data'];
    final onboarding = data is Map<String, dynamic> ? data : null;
    if (onboarding?['onboardingStatus'] == 'published') {
      return PostAuthResult(PostAuthDestination.home);
    }
    final step = onboarding?['onboardingStep'];
    return PostAuthResult(
      PostAuthDestination.onboarding,
      onboardingStep: step is int && step > 0 ? step : 1,
    );
  }

  Future<PostAuthResult> loginWithEmail(String email, String password) async {
    final deviceId = await _deviceId();
    final body = await _api.post('/auth/login', {
      'email': email,
      'password': password,
      'deviceId': deviceId,
    });
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Login response was incomplete.');
    }
    await _storeTokens(data, notify: false);
    final destination = await _postAuthDestination();
    _startupLocation = destination.destination == PostAuthDestination.home
        ? '/home/discover'
        : '/onboarding?step=${destination.onboardingStep}';
    notifyListeners();
    return destination;
  }

  /// Verifies a newly registered email and creates the first app session in
  /// one action, so new members continue directly into profile onboarding.
  Future<PostAuthResult> verifyEmailAndStartSession(
      String email, String code) async {
    final deviceId = await _deviceId();
    final body = await _api.post('/auth/email/verify', {
      'email': email,
      'code': code,
      'deviceId': deviceId,
    });
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Email verification response was incomplete.');
    }
    await _storeTokens(data, notify: false);
    final destination = await _postAuthDestination();
    _startupLocation = destination.destination == PostAuthDestination.home
        ? '/home/discover'
        : '/onboarding?step=${destination.onboardingStep}';
    notifyListeners();
    return destination;
  }

  Future<void> requestEmailLoginCode(String email) =>
      _api.post('/auth/email/login/request', {'email': email});

  Future<bool> emailAccountExists(String email) async {
    final body = await _api.post('/auth/email/check', {'email': email});
    final data = body['data'];
    return data is Map<String, dynamic> && data['accountExists'] == true;
  }

  Future<void> requestPhoneLoginCode(String phoneNumber) =>
      _api.post('/auth/phone/login/request', {'phoneNumber': phoneNumber});

  Future<PostAuthResult> verifyPhoneLoginCode(
    String phoneNumber,
    String code,
  ) async {
    final deviceId = await _deviceId();
    final body = await _api.post('/auth/phone/login/verify', {
      'phoneNumber': phoneNumber,
      'code': code,
      'deviceId': deviceId,
    });
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Verification response was incomplete.');
    }
    await _storeTokens(data, notify: false);
    final destination = await _postAuthDestination();
    _startupLocation = destination.destination == PostAuthDestination.home
        ? '/home/discover'
        : '/onboarding?step=${destination.onboardingStep}';
    notifyListeners();
    return destination;
  }

  /// Phone-only sign-up (no email/password): creates a pending account and
  /// texts an OTP. See auth.service.ts#registerPhone.
  Future<void> registerPhone(
    String phoneNumber,
    DateTime dateOfBirth,
    String locale,
  ) {
    return _api.post('/auth/phone/register', {
      'phoneNumber': phoneNumber,
      'dateOfBirth':
          '${dateOfBirth.year.toString().padLeft(4, '0')}-${dateOfBirth.month.toString().padLeft(2, '0')}-${dateOfBirth.day.toString().padLeft(2, '0')}',
      'confirmedAdult': true,
      'acceptedTermsVersion': '2026-01',
      'acceptedPrivacyVersion': '2026-01',
      'locale': locale,
    });
  }

  /// Completes phone sign-up: verifies the OTP and starts the first
  /// session, same shape as [verifyPhoneLoginCode].
  Future<PostAuthResult> verifyPhoneRegistration(
    String phoneNumber,
    String code,
  ) async {
    final deviceId = await _deviceId();
    final body = await _api.post('/auth/phone/register/verify', {
      'phoneNumber': phoneNumber,
      'code': code,
      'deviceId': deviceId,
    });
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Verification response was incomplete.');
    }
    await _storeTokens(data, notify: false);
    final destination = await _postAuthDestination();
    _startupLocation = destination.destination == PostAuthDestination.home
        ? '/home/discover'
        : '/onboarding?step=${destination.onboardingStep}';
    notifyListeners();
    return destination;
  }

  Future<void> requestPasswordReset(String email) =>
      _api.post('/auth/password-reset/request', {'email': email});

  Future<bool> refreshSession() async {
    final refresh = _refreshToken;
    if (refresh == null) return false;
    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiUrl,
          headers: const {'Content-Type': 'application/json'},
        ),
      );
      final response = await dio.post<dynamic>(
        '/auth/refresh',
        data: {'refreshToken': refresh},
      );
      final body = response.data;
      final data = body is Map<String, dynamic> ? body['data'] : null;
      if (data is! Map<String, dynamic>) return false;
      await _storeTokens(data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    final refresh = _refreshToken;
    if (refresh != null) {
      try {
        await _api.post('/auth/logout', {'refreshToken': refresh});
      } catch (_) {
        // Local credentials are still cleared when the server is unavailable.
      }
    }
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: accessTokenKey);
    await _storage.delete(key: refreshTokenKey);
    _setUnauthenticated();
  }

  void _setUnauthenticated() {
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
