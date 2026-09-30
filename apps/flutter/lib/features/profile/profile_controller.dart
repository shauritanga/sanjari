import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'profile_hub.dart';
import 'profile_repository.dart';

/// Profile hub state. Ports the view-mode loads from profile.tsx
/// (GET /onboarding + verification cases); the full editor is a later
/// phase, so there is no save/publish logic here yet.
class ProfileHubController extends ChangeNotifier {
  ProfileHubController(this._repository);

  final ProfileRepository _repository;

  OnboardingState _state = const OnboardingState();
  List<VerificationCase> _cases = const [];
  bool _loading = true;
  String? _error;
  bool _loggingOut = false;

  OnboardingState get state => _state;
  List<VerificationCase> get cases => _cases;
  bool get loading => _loading;
  String? get error => _error;
  bool get loggingOut => _loggingOut;

  bool get photoVerified =>
      latestVerificationFor(_cases, 'selfie_liveness')?.approved ?? false;

  bool get idVerified =>
      latestVerificationFor(_cases, 'identity_document')?.approved ?? false;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _state = await _repository.fetchOnboarding();
      try {
        _cases = await _repository.fetchVerificationCases();
      } catch (_) {
        // Verification badges are advisory; a failure here must not fail
        // the whole hub (mirrors the .catch(() => undefined) in profile.tsx).
      }
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadProfile';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setLoggingOut(bool value) {
    _loggingOut = value;
    notifyListeners();
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(sessionProvider).api);
});

final profileHubControllerProvider =
    ChangeNotifierProvider<ProfileHubController>((ref) {
  return ProfileHubController(ref.watch(profileRepositoryProvider));
});
