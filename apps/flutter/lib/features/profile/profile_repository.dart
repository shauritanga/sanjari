import '../../core/api_client.dart';
import 'profile_hub.dart';

/// Typed wrapper over the hub's two reads in profile.tsx:
/// GET /onboarding (profile, score, status, age, member-since) and
/// GET /onboarding/verification (verification cases for the badges).
class ProfileRepository {
  ProfileRepository(this._api);

  final ApiClient _api;

  Future<OnboardingState> fetchOnboarding() async {
    final body = await _api.get('/onboarding');
    final data = body['data'];
    return OnboardingState.fromJson(
      data is Map<String, dynamic> ? data : null,
    );
  }

  /// Editor load: one GET /onboarding with the raw profile map intact
  /// (the hub's parsed subset drops editor fields), plus score, status,
  /// and age.
  Future<EditorSnapshot> fetchEditor() async {
    final body = await _api.get('/onboarding');
    final data = body['data'];
    final map = data is Map<String, dynamic> ? data : null;
    final profile = map?['profile'];
    return EditorSnapshot(
      profileJson:
          profile is Map<String, dynamic> ? profile : const {},
      completionScore: (map?['completionScore'] as num?)?.toInt() ?? 0,
      onboardingStatus:
          map?['onboardingStatus'] as String? ?? 'not_started',
      age: (map?['age'] as num?)?.toInt(),
    );
  }

  Future<List<VerificationCase>> fetchVerificationCases() async {
    final body = await _api.get('/onboarding/verification');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(VerificationCase.fromJson)
        .toList();
  }

  /// Editor save: PUT /onboarding with the step-4 payload, returning the
  /// new completion score (missing reads as null, like the Expo screen
  /// keeping its current score).
  Future<int?> saveProfile(Map<String, dynamic> payload) async {
    final body = await _api.put('/onboarding', payload);
    final data = body['data'];
    if (data is Map<String, dynamic>) {
      return (data['completionScore'] as num?)?.toInt();
    }
    return null;
  }

  /// Editor publish: POST /onboarding/publish, returning the score and
  /// status triple the screen merges into state.
  Future<PublishResult> publishProfile() async {
    final body = await _api.post('/onboarding/publish', const {});
    final data = body['data'];
    if (data is Map<String, dynamic>) {
      return PublishResult(
        completionScore: (data['completionScore'] as num?)?.toInt(),
        onboardingStatus: data['onboardingStatus'] as String?,
      );
    }
    return PublishResult();
  }

  /// Discovery pause toggle: PATCH /onboarding/discovery-pause, echoing
  /// the requested value when the server stays silent (like the Expo
  /// screen's `?? !paused` fallback).
  Future<bool> setDiscoveryPaused(bool paused) async {
    final body = await _api.patch(
      '/onboarding/discovery-pause',
      {'paused': paused},
    );
    final data = body['data'];
    if (data is Map<String, dynamic> && data['paused'] is bool) {
      return data['paused'] as bool;
    }
    return paused;
  }
}

/// Publish response subset the editor merges into state.
class PublishResult {
  PublishResult({this.completionScore, this.onboardingStatus});

  final int? completionScore;
  final String? onboardingStatus;
}

/// Raw editor load in one round trip.
class EditorSnapshot {
  EditorSnapshot({
    required this.profileJson,
    required this.completionScore,
    required this.onboardingStatus,
    required this.age,
  });

  final Map<String, dynamic> profileJson;
  final int completionScore;
  final String onboardingStatus;
  final int? age;
}
