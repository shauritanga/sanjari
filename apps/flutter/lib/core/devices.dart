/// Device capability seams. Pure-Dart ports of the expo-* calls used by the
/// onboarding device screens (photos, location, verification,
/// notifications, voice-intro), following the PasscodeStorage/Biometrics
/// pattern: the UI and pipeline code depend on these abstracts, tests
/// substitute fakes, and the plugin implementations live in
/// devices_impl.dart (platform channels cannot run under `dart test`).
///
/// Denial vs cancel vs failure follows the Expo screens: permission denial
/// throws [DeviceDenied] carrying the user-facing copy, user cancellation
/// resolves to null, and anything else throws.
class DeviceDenied implements Exception {
  DeviceDenied(this.message);

  final String message;

  @override
  String toString() => 'DeviceDenied: $message';
}

/// A recording finished with no saved file.
class EmptyRecording implements Exception {}

/// Image bytes picked from the gallery or camera.
class PickedMedia {
  PickedMedia({
    required this.bytes,
    required this.mimeType,
    required this.sizeBytes,
  });

  final List<int> bytes;
  final String mimeType;
  final int sizeBytes;
}

abstract class MediaPicker {
  Future<bool> ensureGalleryAccess();
  Future<bool> ensureCameraAccess();

  /// Opens the OS app-settings page so the user can re-grant a denied
  /// permission. Backs the "Open Settings" action on denial dialogs.
  Future<void> openSettings();

  /// Null when the user cancels.
  Future<PickedMedia?> pickImage();

  /// Gallery multi-select, capped at [limit]. Empty when cancelled.
  Future<List<PickedMedia>> pickImages({int limit = 10});

  /// Null when the user cancels. [front] selects the selfie camera.
  Future<PickedMedia?> takePhoto({bool front = false});
}

/// Raw binary PUT used for presigned uploads. Port of uploadBinaryFile in
/// apps/mobile/src/upload.ts: non-2xx responses throw.
abstract class BinaryUploader {
  Future<void> put(String url, List<int> bytes, String mimeType);
}

/// A finished voice take.
class VoiceTake {
  VoiceTake({required this.path, required this.durationMs});

  final String path;
  final int durationMs;
}

abstract class VoiceRecorder {
  Future<bool> ensureMicAccess();
  Future<void> start();
  Future<VoiceTake> stop();
  Stream<Duration> get progress;
}

abstract class SoundPlayer {
  Future<void> play(String path);
  Future<void> pause();
  Stream<bool> get playing;
}

class GeoFix {
  GeoFix({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
  });

  final double latitude;
  final double longitude;
  final int accuracyMeters;
}

abstract class LocationService {
  Future<bool> ensureAccess();
  Future<GeoFix> current();
}

abstract class PushRegistrar {
  Future<bool> ensureAccess();

  /// Null when no token is available (simulators, Expo Go without a
  /// project id) — the grant still counts, like the Expo screen.
  Future<String?> fetchToken();
}

/// Address-book seam for contacts-block. Tests substitute canned numbers;
/// the plugin implementation lives in devices_impl.dart.
abstract class ContactsReader {
  Future<bool> ensureAccess();
  Future<List<String>> fetchPhoneNumbers();
}

/// PostGIS point literal for POST /discovery/location, mirroring the
/// location screen (`SRID=4326;POINT(<lon> <lat>)`).
String locationWkt(double longitude, double latitude) =>
    'SRID=4326;POINT($longitude $latitude)';

/// Push provider string for POST /notifications/push-token.
String pushProviderName({required bool isIOS}) => isIOS ? 'ios' : 'android';

/// The Expo screen only registers tokens of 16+ characters.
bool shouldRegisterPushToken(String? token) =>
    token != null && token.length >= 16;

/// Recorder counter value: seconds capped at the 60s limit.
int voiceSeconds(int durationMillis) {
  final seconds = (durationMillis / 1000).round();
  return seconds > 60 ? 60 : seconds;
}

/// 60s auto-stop threshold from the voice screen.
const int maxVoiceMillis = 60 * 1000;
