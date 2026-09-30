import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import '../../core/devices_impl.dart';
import '../auth/session_provider.dart';
import 'locations_repository.dart';
import 'media_repository.dart';
import 'onboarding_models.dart';
import 'onboarding_repository.dart';

/// Onboarding draft state owner. Ports the logic of
/// apps/mobile/src/store/onboarding.ts (hydrate, saveOnboarding,
/// setPromptAnswers, setDiscoveryPreference, plus the local-only setters)
/// as a ChangeNotifier so the per-step screens share one draft:
/// - hydrate() pulls GET /onboarding (+ best-effort discovery preferences)
/// - save() PUTs the step fields and merges the server progress triple
/// - prompt/preference setters persist first, then update local state
/// - photo/location/notification/voice setters stay local-only, like the
///   store (upload and device-permission flows live in their step screens)
class OnboardingController extends ChangeNotifier {
  OnboardingController(this._repository);

  final OnboardingRepository _repository;

  OnboardingDraft _draft = OnboardingDraft();
  bool _saving = false;
  String? _error;

  OnboardingDraft get draft => _draft;
  bool get saving => _saving;
  String? get error => _error;

  Future<void> hydrate() async {
    try {
      _draft = await _repository.hydrate();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoad';
    }
    notifyListeners();
  }

  Future<bool> save(Map<String, dynamic> fields, int step) async {
    _saving = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _repository.saveOnboarding(fields, step);
      _draft.applySave(fields, result);
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToSave';
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  Future<bool> savePrompts(List<PromptAnswerDraft> answers) async {
    _saving = true;
    _error = null;
    notifyListeners();
    try {
      await _repository.setPromptAnswers(answers);
      _draft.promptAnswers = answers;
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToSave';
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  Future<bool> publishProfile() async {
    _saving = true;
    _error = null;
    notifyListeners();
    try {
      await _repository.publish();
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToSave';
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  Future<bool> saveDiscoveryPreference(Map<String, dynamic> patch) async {
    _saving = true;
    _error = null;
    notifyListeners();
    try {
      final merged = _draft.discoveryPreference.merge(patch);
      await _repository.setDiscoveryPreference(merged);
      _draft.discoveryPreference = merged;
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToSave';
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  void setPhotos(List<OnboardingPhoto> photos) {
    _draft.photos = photos;
    notifyListeners();
  }

  void setApproximateLocationSet(bool value) {
    _draft.approximateLocationSet = value;
    notifyListeners();
  }

  void setNotificationsEnabled(bool value) {
    _draft.notificationsEnabled = value;
    notifyListeners();
  }

  void setVoiceIntroKey(String? key) {
    _draft.voiceIntroKey = key;
    notifyListeners();
  }
}

final onboardingRepositoryProvider = Provider<OnboardingRepository>((ref) {
  return OnboardingRepository(ref.watch(sessionProvider).api);
});

final locationsRepositoryProvider = Provider<LocationsRepository>((ref) {
  return LocationsRepository(ref.watch(sessionProvider).api);
});

final mediaRepositoryProvider = Provider<MediaRepository>((ref) {
  return MediaRepository(
    ref.watch(sessionProvider).api,
    DioBinaryUploader(),
  );
});

final mediaPickerProvider = Provider<MediaPicker>((ref) {
  return PluginMediaPicker();
});

final voiceRecorderProvider = Provider<VoiceRecorder>((ref) {
  return RecordVoiceRecorder();
});

final soundPlayerProvider = Provider<SoundPlayer>((ref) {
  return AudioPlayersSound();
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return GeolocatorService();
});

final pushRegistrarProvider = Provider<PushRegistrar>((ref) {
  return FirebasePushRegistrar();
});

final onboardingControllerProvider =
    ChangeNotifierProvider<OnboardingController>((ref) {
  return OnboardingController(ref.watch(onboardingRepositoryProvider));
});
