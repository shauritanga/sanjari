import '../../core/api_client.dart';
import 'onboarding_models.dart';

/// Prompt catalogue entry from GET /onboarding/prompts. Port of the
/// PromptOption interface in apps/mobile/app/onboarding/prompts.tsx.
class PromptOption {
  PromptOption({
    required this.id,
    required this.prompt,
    required this.locale,
  });

  final String id;
  final String prompt;
  final String locale;

  factory PromptOption.fromJson(Map<String, dynamic> json) {
    return PromptOption(
      id: json['id'] as String? ?? '',
      prompt: json['prompt'] as String? ?? '',
      locale: json['locale'] as String? ?? '',
    );
  }
}

/// Typed wrapper over the onboarding endpoints in
/// apps/api/src (profiles/onboarding controllers), mirroring every call in
/// apps/mobile/src/store/onboarding.ts.
///
/// The backend wraps payloads in a `{data: ...}` envelope (same convention
/// as the chat repository); the discovery-preferences fetch stays failable
/// so the controller can keep defaults until that step, exactly like the
/// store's try/catch in hydrate().
class OnboardingRepository {
  OnboardingRepository(this._api);

  final ApiClient _api;

  Future<OnboardingDraft> hydrate() async {
    final body = await _api.get('/onboarding');
    final data = body['data'];
    final draft = OnboardingDraft.hydrated(
      data is Map<String, dynamic> ? data : const {},
    );
    try {
      final prefsBody = await _api.get('/onboarding/discovery-preferences');
      final prefs = prefsBody['data'];
      if (prefs is Map<String, dynamic>) {
        draft.discoveryPreference = DiscoveryPreferenceDraft.fromJson(prefs);
      }
    } on ApiException {
      // Discovery preferences are optional until the user reaches that step.
    }
    return draft;
  }

  /// PUT /onboarding with `{...fields, step}`; returns the server's progress
  /// triple for [OnboardingDraft.applySave].
  Future<Map<String, dynamic>> saveOnboarding(
    Map<String, dynamic> fields,
    int step,
  ) async {
    final body = await _api.put('/onboarding', {...fields, 'step': step});
    final data = body['data'];
    if (data is Map<String, dynamic>) return data;
    return const {};
  }

  /// GET /onboarding/prompts?locale=.. — the Expo screen hardcodes en.
  Future<List<PromptOption>> fetchPrompts({String locale = 'en'}) async {
    final body = await _api.get(
      '/onboarding/prompts?locale=${Uri.encodeComponent(locale)}',
    );
    final data = body['data'];
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(PromptOption.fromJson)
          .toList();
    }
    return const [];
  }

  Future<void> setPromptAnswers(List<PromptAnswerDraft> answers) async {
    await _api.put(
      '/onboarding/prompts',
      {
        'answers': answers.map((answer) => answer.toJson()).toList(),
      },
    );
  }

  /// POST /onboarding/publish — flips the profile live. The Expo screen
  /// ignores the payload and replaces the route with the discover tab.
  Future<void> publish() async {
    await _api.post('/onboarding/publish', const {});
  }

  Future<DiscoveryPreferenceDraft> setDiscoveryPreference(
    DiscoveryPreferenceDraft merged,
  ) async {
    await _api.put('/onboarding/discovery-preferences', merged.toJson());
    return merged;
  }
}
