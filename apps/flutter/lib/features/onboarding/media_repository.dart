import 'dart:io';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'onboarding_models.dart';

/// Presigned upload ticket shared by the photo, voice, and verification
/// pipelines.
class PresignedUpload {
  PresignedUpload({required this.storageKey, required this.uploadUrl});

  final String storageKey;
  final String uploadUrl;

  factory PresignedUpload.fromJson(Map<String, dynamic> json) {
    return PresignedUpload(
      storageKey: json['storageKey'] as String? ?? '',
      uploadUrl: json['uploadUrl'] as String? ?? '',
    );
  }

  bool get isValid => storageKey.isNotEmpty && uploadUrl.isNotEmpty;
}

/// Verification case from GET /onboarding/verification. Port of the
/// VerificationCase interface in apps/mobile/src/verification.ts.
class VerificationCase {
  VerificationCase({
    required this.id,
    required this.type,
    required this.status,
    required this.provider,
  });

  final String id;
  final String type;
  final String status;
  final String provider;

  factory VerificationCase.fromJson(Map<String, dynamic> json) {
    return VerificationCase(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      provider: json['provider'] as String? ?? '',
    );
  }
}

/// Status copy for the verification cards. Port of statusLabel().
String verificationStatusLabel(String? status) {
  switch (status) {
    case 'approved':
      return 'Verified';
    case 'submitted':
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Rejected — try again';
    default:
      return 'Not started';
  }
}

/// Media pipelines for the device onboarding screens. Pure-Dart
/// orchestration over [ApiClient] and the [BinaryUploader] seam, porting
/// PhotoGrid.tsx (presign → PUT → complete/replace, DELETE remove, PATCH
/// reorder), verification.ts (presign → PUT → request), the voice screen
/// (presign → PUT → complete, DELETE remove), the location screen
/// (POST /discovery/location), and the notifications screen
/// (POST /notifications/push-token).
class MediaRepository {
  MediaRepository(this._api, this._uploader);

  final ApiClient _api;
  final BinaryUploader _uploader;

  Future<PresignedUpload> _presign(
    String path,
    String mimeType,
    int sizeBytes,
  ) async {
    final body = await _api.post(path, {
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
    });
    final data = body['data'];
    final ticket = PresignedUpload.fromJson(
      data is Map<String, dynamic> ? data : const {},
    );
    if (!ticket.isValid) throw ApiException('Unable to prepare upload.');
    return ticket;
  }

  Future<OnboardingPhoto> uploadPhoto(PickedMedia media) async {
    final ticket = await _presign(
      '/onboarding/photos/presign',
      media.mimeType,
      media.sizeBytes,
    );
    await _uploader.put(ticket.uploadUrl, media.bytes, media.mimeType);
    final body = await _api.post(
      '/onboarding/photos/complete',
      {'storageKey': ticket.storageKey},
    );
    final data = body['data'];
    if (data is Map<String, dynamic>) return OnboardingPhoto.fromJson(data);
    throw ApiException('Unable to complete upload.');
  }

  Future<OnboardingPhoto> replacePhoto(String id, PickedMedia media) async {
    final ticket = await _presign(
      '/onboarding/photos/presign',
      media.mimeType,
      media.sizeBytes,
    );
    await _uploader.put(ticket.uploadUrl, media.bytes, media.mimeType);
    final body = await _api.post(
      '/onboarding/photos/$id/replace',
      {'storageKey': ticket.storageKey},
    );
    final data = body['data'];
    if (data is Map<String, dynamic>) return OnboardingPhoto.fromJson(data);
    throw ApiException('Unable to complete upload.');
  }

  Future<void> removePhoto(String id) async {
    await _api.remove('/onboarding/photos/$id');
  }

  /// Best-effort like the Expo screen — callers swallow failures and the
  /// next load resyncs the true order.
  Future<void> reorderPhotos(List<String> photoIds) async {
    await _api.patch('/onboarding/photos/reorder', {'photoIds': photoIds});
  }

  Future<List<VerificationCase>> fetchVerificationCases() async {
    final body = await _api.get('/onboarding/verification');
    final data = body['data'];
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(VerificationCase.fromJson)
          .toList();
    }
    return const [];
  }

  Future<VerificationCase> submitVerification(
    String type,
    PickedMedia media,
  ) async {
    final ticket = await _presign(
      '/onboarding/verification/$type/presign',
      media.mimeType,
      media.sizeBytes,
    );
    await _uploader.put(ticket.uploadUrl, media.bytes, media.mimeType);
    final body = await _api.post(
      '/onboarding/verification/$type/request',
      {'storageKey': ticket.storageKey},
    );
    final data = body['data'];
    if (data is Map<String, dynamic>) return VerificationCase.fromJson(data);
    throw ApiException('Unable to submit verification.');
  }

  /// Uploads a recorded file, returning its storage key for setVoiceIntroKey.
  Future<String> uploadVoiceRecording(String path) async {
    const mimeType = 'audio/m4a';
    final bytes = await File(path).readAsBytes();
    final ticket = await _presign(
      '/onboarding/voice-intro/presign',
      mimeType,
      bytes.length,
    );
    await _uploader.put(ticket.uploadUrl, bytes, mimeType);
    await _api.post(
      '/onboarding/voice-intro/complete',
      {'storageKey': ticket.storageKey},
    );
    return ticket.storageKey;
  }

  Future<void> removeVoiceRecording() async {
    await _api.remove('/onboarding/voice-intro');
  }

  Future<void> postLocation({
    required String wkt,
    required int accuracyMeters,
    required String approximateCity,
  }) async {
    await _api.post('/discovery/location', {
      'protectedPointWkt': wkt,
      'accuracyMeters': accuracyMeters,
      if (approximateCity.isNotEmpty) 'approximateCity': approximateCity,
      'source': 'onboarding',
    });
  }

  Future<void> registerPushToken({
    required String token,
    required String provider,
  }) async {
    await _api.post('/notifications/push-token', {
      'token': token,
      'provider': provider,
    });
  }
}
