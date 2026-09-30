import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import '../auth/session_provider.dart';
import '../onboarding/locations_repository.dart';
import '../onboarding/media_repository.dart' hide VerificationCase;
import '../onboarding/onboarding_controller.dart';
import '../onboarding/onboarding_models.dart';
import 'profile_editor.dart';
import 'profile_hub.dart';
import 'profile_repository.dart';

/// Profile editor state. Ports the edit-mode logic of
/// apps/mobile/app/(tabs)/profile.tsx: parallel loads (profile, location
/// catalogue, verification cases), step-4 save, publish, discovery pause,
/// camera verification capture, and the country/city pickers. Every field
/// edit clears the saved flag, like the Expo setters.
class ProfileEditController extends ChangeNotifier {
  ProfileEditController(
    this._repository,
    this._locations,
    this._media,
    this._picker,
  );

  final ProfileRepository _repository;
  final LocationsRepository _locations;
  final MediaRepository _media;
  final MediaPicker _picker;

  EditableProfile _profile = EditableProfile();
  int? _age;
  int _score = 0;
  String _onboardingStatus = 'not_started';
  List<CatalogCountry> _countries = const [];
  List<VerificationCase> _cases = const [];
  bool _paused = false;
  bool _loading = true;
  bool _saving = false;
  bool _publishing = false;
  bool _saved = false;
  String _error = '';
  String? _requesting;

  EditableProfile get profile => _profile;
  int? get age => _age;
  int get score => _score;
  String get onboardingStatus => _onboardingStatus;
  List<CatalogCountry> get countries => _countries;
  List<VerificationCase> get cases => _cases;
  bool get paused => _paused;
  bool get loading => _loading;
  bool get saving => _saving;
  bool get publishing => _publishing;
  bool get saved => _saved;
  String get error => _error;
  String? get requesting => _requesting;

  CatalogCountry? get selectedCountry {
    for (final country in _countries) {
      if (country.code == _profile.countryCode) return country;
    }
    return null;
  }

  VerificationCase? latestFor(String type) =>
      latestVerificationFor(_cases, type);

  Future<void> load() async {
    _loading = true;
    _error = '';
    notifyListeners();
    try {
      final snapshot = await _repository.fetchEditor();
      _profile = EditableProfile.fromJson(snapshot.profileJson);
      _score = snapshot.completionScore;
      _onboardingStatus = snapshot.onboardingStatus;
      _age = snapshot.age;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Unable to load profile.';
    }
    try {
      _countries = await _locations.fetchCountries();
    } catch (_) {
      if (_error.isEmpty) _error = 'Unable to load the location list.';
    }
    try {
      _cases = await _repository.fetchVerificationCases();
    } catch (_) {
      // Advisory like the hub — must not fail the editor.
    }
    _loading = false;
    notifyListeners();
  }

  /// Mutates the draft in place and clears the saved flag.
  void edit(void Function(EditableProfile) mutate) {
    mutate(_profile);
    _saved = false;
    notifyListeners();
  }

  void setPhotos(List<OnboardingPhoto> photos) {
    edit((draft) => draft.photos = photos);
  }

  void selectCountry(String countryCode) {
    edit((draft) {
      draft.countryCode = countryCode;
      draft.cityId = null;
      draft.cityName = null;
      draft.city = null;
    });
  }

  void selectCity(String cityId) {
    final cities = selectedCountry?.cities ?? const [];
    CatalogCity? match;
    for (final city in cities) {
      if (city.id == cityId) match = city;
    }
    if (match == null) return;
    final name = match.name;
    edit((draft) {
      draft.cityId = match!.id;
      draft.cityName = name;
      draft.city = name;
    });
  }

  Future<void> save() async {
    _error = '';
    _saved = false;
    _saving = true;
    notifyListeners();
    try {
      final score = await _repository.saveProfile(_profile.toSavePayload());
      if (score != null) _score = score;
      if (_onboardingStatus != 'published') {
        _onboardingStatus = 'in_progress';
      }
      _saved = true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Unable to save profile.';
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  Future<void> publish() async {
    _error = '';
    _publishing = true;
    notifyListeners();
    try {
      final result = await _repository.publishProfile();
      if (result.completionScore != null) _score = result.completionScore!;
      _onboardingStatus = result.onboardingStatus ?? 'published';
    } catch (e) {
      _error = e is ApiException
          ? e.message
          : 'Complete the required fields before publishing.';
    } finally {
      _publishing = false;
      notifyListeners();
    }
  }

  Future<void> togglePause() async {
    try {
      _paused = await _repository.setDiscoveryPaused(!_paused);
    } catch (e) {
      _error = e is ApiException ? e.message : 'Unable to update discovery.';
    }
    notifyListeners();
  }

  Future<void> requestVerification(String type) async {
    _error = '';
    _requesting = type;
    notifyListeners();
    try {
      if (!await _picker.ensureCameraAccess()) {
        throw DeviceDenied(
          'Camera access is needed to complete verification.',
        );
      }
      final taken = await _picker.takePhoto(
        front: type == 'selfie_liveness',
      );
      if (taken == null) return;
      final submitted = await _media.submitVerification(type, taken);
      _cases = [
        VerificationCase(
          id: submitted.id,
          type: submitted.type,
          status: submitted.status,
        ),
        for (final item in _cases)
          if (item.id != submitted.id) item,
      ];
    } catch (e) {
      _error = e is DeviceDenied
          ? e.message
          : e is ApiException
              ? e.message
              : 'Unable to submit verification.';
    } finally {
      _requesting = null;
      notifyListeners();
    }
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(sessionProvider).api);
});

final profileEditControllerProvider =
    ChangeNotifierProvider<ProfileEditController>((ref) {
  // Media + location providers live with the onboarding feature that
  // introduced them; the editor reuses the same seams.
  return ProfileEditController(
    ref.watch(profileRepositoryProvider),
    ref.watch(locationsRepositoryProvider),
    ref.watch(mediaRepositoryProvider),
    ref.watch(mediaPickerProvider),
  );
});
