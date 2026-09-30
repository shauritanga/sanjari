import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'settings_models.dart';
import 'settings_repository.dart';

/// Settings hub state. Ports the loads and mutations from settings.tsx:
/// sessions, notification push toggles, and visibility mode load in
/// parallel; revoke/toggle/mode changes apply optimistically like Expo.
class SettingsController extends ChangeNotifier {
  SettingsController(this._repository);

  final SettingsRepository _repository;

  List<UserSession> _sessions = [];
  List<NotificationPreference> _preferences = [];
  VisibilityMode _visibilityMode = VisibilityMode.everyone;
  bool _loading = true;
  String? _error;
  bool _sharing = false;
  bool _loggingOut = false;

  List<UserSession> get sessions => _sessions;
  List<NotificationPreference> get preferences => _preferences;
  VisibilityMode get visibilityMode => _visibilityMode;
  bool get loading => _loading;
  String? get error => _error;
  bool get sharing => _sharing;
  bool get loggingOut => _loggingOut;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _repository.fetchSessions(),
        _repository.fetchPreferences(),
        _repository.fetchVisibilityMode(),
      ]);
      _sessions = results[0] as List<UserSession>;
      _preferences = results[1] as List<NotificationPreference>;
      _visibilityMode = results[2] as VisibilityMode;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadSettings';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> revokeSession(String sessionId) async {
    _sessions = _sessions.where((s) => s.id != sessionId).toList();
    notifyListeners();
    try {
      await _repository.revokeSession(sessionId);
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToRevokeSession';
      notifyListeners();
    }
  }

  Future<void> togglePush(String category, bool value) async {
    _preferences = _preferences
        .map((p) => p.category == category ? p.copyWith(push: value) : p)
        .toList();
    notifyListeners();
    try {
      await _repository.setPush(category, value);
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToUpdateNotifications';
      notifyListeners();
    }
  }

  Future<void> selectVisibility(VisibilityMode mode) async {
    _visibilityMode = mode;
    notifyListeners();
    try {
      await _repository.setVisibilityMode(mode);
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToUpdateVisibility';
      notifyListeners();
    }
  }

  /// Creates a share link and returns the message to share, or null when
  /// creation failed (the error is surfaced on the page instead).
  Future<String?> shareMessage() async {
    _sharing = true;
    _error = null;
    notifyListeners();
    try {
      final token = await _repository.createShareLink();
      return 'Check out my Sanjari profile: sanjari://profile/share/$token';
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToShareProfile';
      notifyListeners();
      return null;
    } finally {
      _sharing = false;
      notifyListeners();
    }
  }

  void setLoggingOut(bool value) {
    _loggingOut = value;
    notifyListeners();
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(sessionProvider).api);
});

final settingsControllerProvider =
    ChangeNotifierProvider<SettingsController>((ref) {
  return SettingsController(ref.watch(settingsRepositoryProvider));
});
