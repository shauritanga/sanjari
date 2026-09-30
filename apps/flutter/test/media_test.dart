import 'dart:io';

import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/core/devices.dart';
import 'package:sanjari/features/onboarding/media_repository.dart';
import 'package:sanjari/features/onboarding/onboarding_models.dart';
import 'package:sanjari/features/onboarding/photo_order.dart';

import 'mock_api.dart';

class FakeUploader implements BinaryUploader {
  final puts = <String>[];
  bool fail = false;

  @override
  Future<void> put(String url, List<int> bytes, String mimeType) async {
    if (fail) throw Exception('network down');
    puts.add('$url|$mimeType|${bytes.length}');
  }
}

OnboardingPhoto photo(String id, {bool primary = false}) => OnboardingPhoto(
      id: id,
      position: 0,
      isPrimary: primary,
      moderationStatus: 'approved',
    );

Map<String, dynamic> photoJson(String id) => {
      'id': id,
      'position': 0,
      'isPrimary': true,
      'moderationStatus': 'approved',
      'url': 'https://cdn/$id.jpg',
    };

void main() {
  group('device helpers', () {
    test('location WKT matches the Expo literal', () {
      expect(locationWkt(39.28, -6.8), 'SRID=4326;POINT(39.28 -6.8)');
    });

    test('push provider names follow the platform', () {
      expect(pushProviderName(isIOS: true), 'ios');
      expect(pushProviderName(isIOS: false), 'android');
    });

    test('short tokens are not registered', () {
      expect(shouldRegisterPushToken(null), isFalse);
      expect(shouldRegisterPushToken('short'), isFalse);
      expect(shouldRegisterPushToken('a' * 16), isTrue);
    });

    test('voice counter caps at 60 seconds', () {
      expect(voiceSeconds(3250), 3);
      expect(voiceSeconds(59999), 60);
      expect(voiceSeconds(90000), 60);
    });

    test('verification status labels mirror the Expo switch', () {
      expect(verificationStatusLabel('approved'), 'Verified');
      expect(verificationStatusLabel('submitted'), 'In review');
      expect(verificationStatusLabel('pending'), 'In review');
      expect(verificationStatusLabel('rejected'), 'Rejected — try again');
      expect(verificationStatusLabel(null), 'Not started');
      expect(verificationStatusLabel('weird'), 'Not started');
    });
  });

  group('photo order', () {
    test('move clamps at the ends and renumbers', () {
      final photos = [photo('a', primary: true), photo('b'), photo('c')];
      final moved = movePhotoInList(photos, 'b', -1);
      expect(moved.map((p) => p.id), ['b', 'a', 'c']);
      expect(moved.first.isPrimary, isTrue);
      expect(moved.map((p) => p.position), [0, 1, 2]);

      expect(movePhotoInList(photos, 'a', -1), same(photos));
      expect(movePhotoInList(photos, 'c', 1), same(photos));
      expect(movePhotoInList(photos, 'missing', 1), same(photos));
    });

    test('primary-first pulls the photo to the front', () {
      final photos = [photo('a', primary: true), photo('b'), photo('c')];
      final next = primaryFirst(photos, 'c');
      expect(next.map((p) => p.id), ['c', 'a', 'b']);
      expect(next.first.isPrimary, isTrue);
      expect(primaryFirst(photos, 'a'), same(photos));
    });
  });

  group('MediaRepository', () {
    test('uploadPhoto runs presign, PUT, complete', () async {
      final seen = <RequestOptions>[];
      final uploader = FakeUploader();
      final repo = MediaRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/presign')) {
              return {
                'data': {'storageKey': 'k1', 'uploadUrl': 'https://up/1'}
              };
            }
            return {
              'data': photoJson('p1')
            };
          },
          seen: seen,
        ),
        uploader,
      );

      final uploaded = await repo.uploadPhoto(
        PickedMedia(bytes: [1, 2, 3], mimeType: 'image/jpeg', sizeBytes: 3),
      );

      expect(uploaded.id, 'p1');
      expect(uploader.puts.single, 'https://up/1|image/jpeg|3');
      expect(seen[0].path, '/onboarding/photos/presign');
      expect(seen[0].data['mimeType'], 'image/jpeg');
      expect(seen[1].path, '/onboarding/photos/complete');
      expect(seen[1].data['storageKey'], 'k1');
    });

    test('uploadPhoto rejects an empty presign envelope', () async {
      final repo = MediaRepository(
        mockApi((_) => {'data': {}}),
        FakeUploader(),
      );

      expect(
        () => repo.uploadPhoto(
          PickedMedia(bytes: [1], mimeType: 'image/jpeg', sizeBytes: 1),
        ),
        throwsA(isA<Exception>()),
      );
    });

    test('reorderPhotos PATCHes the id list', () async {
      final seen = <RequestOptions>[];
      final repo = MediaRepository(
        mockApi((_) => {'data': {}}, seen: seen),
        FakeUploader(),
      );

      await repo.reorderPhotos(['b', 'a']);

      expect(seen.single.path, '/onboarding/photos/reorder');
      expect(seen.single.method, 'PATCH');
      expect(seen.single.data['photoIds'], ['b', 'a']);
    });

    test('verification fetch and submit hit the typed endpoints', () async {
      final seen = <RequestOptions>[];
      final repo = MediaRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/presign')) {
              return {
                'data': {'storageKey': 'k9', 'uploadUrl': 'https://up/9'}
              };
            }
            if (options.path.endsWith('/request')) {
              return {
                'data': {'id': 'v1', 'type': 'selfie_liveness', 'status': 'pending'}
              };
            }
            return {
              'data': [
                {'id': 'v0', 'type': 'selfie_liveness', 'status': 'approved'}
              ]
            };
          },
          seen: seen,
        ),
        FakeUploader(),
      );

      final cases = await repo.fetchVerificationCases();
      expect(cases.single.status, 'approved');

      final submitted = await repo.submitVerification(
        'selfie_liveness',
        PickedMedia(bytes: [7], mimeType: 'image/jpeg', sizeBytes: 1),
      );
      expect(submitted.id, 'v1');
      expect(
        seen.last.path,
        '/onboarding/verification/selfie_liveness/request',
      );
    });

    test('voice upload reads the file and returns the storage key', () async {
      final seen = <RequestOptions>[];
      final uploader = FakeUploader();
      final repo = MediaRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/presign')) {
              return {
                'data': {'storageKey': 'vk', 'uploadUrl': 'https://up/v'}
              };
            }
            return {'data': {}};
          },
          seen: seen,
        ),
        uploader,
      );
      final file = File('${Directory.systemTemp.path}/voice-test.m4a');
      await file.writeAsBytes([1, 2, 3, 4]);

      try {
        final key = await repo.uploadVoiceRecording(file.path);
        expect(key, 'vk');
        expect(uploader.puts.single, 'https://up/v|audio/m4a|4');
        expect(seen[1].path, '/onboarding/voice-intro/complete');
      } finally {
        await file.delete();
      }
    });

    test('location and push posts carry the Expo payloads', () async {
      final seen = <RequestOptions>[];
      final repo = MediaRepository(
        mockApi((_) => {'data': {}}, seen: seen),
        FakeUploader(),
      );

      await repo.postLocation(
        wkt: locationWkt(39.28, -6.8),
        accuracyMeters: 1200,
        approximateCity: 'Dar es Salaam',
      );
      await repo.postLocation(
        wkt: locationWkt(39.28, -6.8),
        accuracyMeters: 1200,
        approximateCity: '',
      );
      await repo.registerPushToken(token: 't' * 20, provider: 'android');

      expect(seen[0].path, '/discovery/location');
      expect(seen[0].data['protectedPointWkt'], 'SRID=4326;POINT(39.28 -6.8)');
      expect(seen[0].data['source'], 'onboarding');
      expect(seen[1].data.containsKey('approximateCity'), isFalse);
      expect(seen[2].path, '/notifications/push-token');
      expect(seen[2].data['provider'], 'android');
    });
  });
}
