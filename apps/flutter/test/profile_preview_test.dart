import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/profile/preview_repository.dart';
import 'package:sanjari/features/profile/profile_detail.dart';

import 'mock_api.dart';

Map<String, dynamic> detailJson() => {
      'id': 'user-1',
      'displayName': 'Amina Zawadi',
      'age': 27,
      'city': 'Dar es Salaam',
      'countryCode': 'TZ',
      'countryName': 'Tanzania',
      'occupationCategory': 'Engineering',
      'educationLevel': 'Bachelor',
      'heightCm': 168,
      'memberSince': '2024-06-15T10:00:00.000Z',
      'biography': 'Hello world',
      'verificationStatus': 'verified',
      'verification': {
        'photoVerified': true,
        'ageVerified': true,
        'idVerified': false,
      },
      'distanceCategory': 'within_25km',
      'photos': [
        {'id': 'p1', 'isPrimary': true, 'url': 'https://x/1.jpg'},
        {'id': 'p2', 'isPrimary': false, 'url': 'https://x/2.jpg'},
      ],
      'interests': [
        {'slug': 'travel', 'labelEn': 'Travel'},
      ],
      'languages': [
        {'code': 'sw', 'labelEn': 'Swahili'},
      ],
      'prompts': [
        {'prompt': 'About me', 'answer': 'I like hiking'},
      ],
      'voiceIntroUrl': 'https://x/voice.m4a',
    };

void main() {
  group('ProfileDetail', () {
    test('parses a full detail payload', () {
      final detail = ProfileDetail.fromJson(detailJson());

      expect(detail.safeName, 'Amina Zawadi');
      expect(detail.initials(), 'AZ');
      expect(detail.age, 27);
      expect(detail.verification.photoVerified, isTrue);
      expect(detail.verification.idVerified, isFalse);
      expect(detail.verification.anyVerified, isTrue);
      expect(detail.photos, hasLength(2));
      expect(detail.interests.single.label, 'Travel');
      expect(detail.languages.single.code, 'sw');
      expect(detail.prompts.single.answer, 'I like hiking');
      expect(detail.voiceIntroUrl, 'https://x/voice.m4a');
    });

    test('tolerates a minimal payload', () {
      final detail = ProfileDetail.fromJson({'id': 'user-2'});

      expect(detail.safeName, 'Sanjari member');
      expect(detail.initials(), '?');
      expect(detail.photos, isEmpty);
      expect(detail.voiceIntroUrl, isNull);
      expect(detail.verification.anyVerified, isFalse);
    });
  });

  group('PreviewRepository', () {
    test('fetches the preview and throws when data is missing', () async {
      final seen = <RequestOptions>[];
      final repo = PreviewRepository(
        mockApi((_) => {'data': detailJson()}, seen: seen),
      );

      final detail = await repo.fetchPreview();
      expect(detail.safeName, 'Amina Zawadi');
      expect(seen.single.path, endsWith('/onboarding/preview'));

      final empty = PreviewRepository(mockApi((_) => {'data': null}));
      expect(
        empty.fetchPreview(),
        throwsA(isA<Exception>()),
      );
    });
  });
}
