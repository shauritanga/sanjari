import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/profile/profile_editor.dart';
import 'package:sanjari/features/profile/profile_repository.dart';

import 'mock_api.dart';

void main() {
  group('EditableProfile', () {
    test('parses the onboarding envelope with fallbacks', () {
      final profile = EditableProfile.fromJson({
        'displayName': 'Amina',
        'gender': 'woman',
        'heightCm': 170,
        'visibilitySettings': {'hideAge': true},
        'photos': [
          {
            'id': 'p1',
            'position': 0,
            'isPrimary': true,
            'moderationStatus': 'approved',
          },
        ],
      });

      expect(profile.displayName, 'Amina');
      expect(profile.heightCm, 170);
      expect(profile.visibility.hideAge, isTrue);
      expect(profile.visibility.hideCity, isFalse);
      expect(profile.interestedIn, isEmpty);
      expect(profile.photos.single.id, 'p1');
    });

    test('save payload mirrors the Expo conditional spreads', () {
      final payload = EditableProfile(
        displayName: 'Amina',
        pronouns: '',
        gender: 'woman',
        countryCode: '',
        cityId: null,
        heightCm: 170,
        drinkingPreference: 'socially',
      ).toSavePayload();

      expect(payload['step'], 4);
      expect(payload['displayName'], 'Amina');
      // Empty strings pass through like the Expo `!== null` spreads...
      expect(payload['pronouns'], '');
      expect(payload['drinkingPreference'], 'socially');
      // ...while empty country/city ids are dropped (truthiness gate).
      expect(payload.containsKey('countryCode'), isFalse);
      expect(payload.containsKey('cityId'), isFalse);
      // Lists and visibility flags always ride along.
      expect(payload['interestedIn'], isEmpty);
      expect(payload['hideAge'], isFalse);
      expect(payload['hideCity'], isFalse);
    });
  });

  group('sanitizeHeightInput', () {
    test('keeps digits only, max 3, empty means unset', () {
      expect(sanitizeHeightInput('170'), 170);
      expect(sanitizeHeightInput('17a0cm'), 170);
      expect(sanitizeHeightInput('1700'), 170);
      expect(sanitizeHeightInput(''), isNull);
      expect(sanitizeHeightInput('cm'), isNull);
    });
  });

  group('profile labels', () {
    test('status and publish copy match profile.tsx', () {
      expect(profileStatusLabel('approved'), 'Verified');
      expect(profileStatusLabel('pending'), 'In review');
      expect(profileStatusLabel('rejected'), 'Rejected — try again');
      expect(profileStatusLabel(null), 'Not started');
      expect(publishStatusLabel('published'), 'Live');
      expect(publishStatusLabel('in_progress'), 'Draft');
      expect(publishStatusLabel('x'), 'Not started');
    });
  });

  group('ProfileRepository editor writes', () {
    test('fetchEditor keeps the raw profile map', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileRepository(
        mockApi(
          (_) => {
            'data': {
              'completionScore': 70,
              'onboardingStatus': 'in_progress',
              'age': 27,
              'profile': {'displayName': 'Amina', 'heightCm': 170},
            },
          },
          seen: seen,
        ),
      );

      final snapshot = await repo.fetchEditor();

      expect(snapshot.completionScore, 70);
      expect(snapshot.age, 27);
      expect(
        EditableProfile.fromJson(snapshot.profileJson).heightCm,
        170,
      );
      expect(seen.single.path, '/onboarding');
    });

    test('saveProfile returns the new score', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileRepository(
        mockApi((_) => {'data': {'completionScore': 87}}, seen: seen),
      );

      expect(await repo.saveProfile({'step': 4}), 87);
      expect(seen.single.path, '/onboarding');
      expect(seen.single.method, 'PUT');
    });

    test('publishProfile merges score and status', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileRepository(
        mockApi(
          (_) => {
            'data': {'completionScore': 100, 'onboardingStatus': 'published'}
          },
          seen: seen,
        ),
      );

      final result = await repo.publishProfile();

      expect(result.completionScore, 100);
      expect(result.onboardingStatus, 'published');
      expect(seen.single.path, '/onboarding/publish');
    });

    test('pause toggle echoes the request when silent', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileRepository(
        mockApi(
          (options) => options.path.endsWith('discovery-pause')
              ? {'data': {}}
              : {
                  'data': {'paused': true}
                },
          seen: seen,
        ),
      );

      // Silent server: fall back to the requested value.
      expect(await repo.setDiscoveryPaused(true), isTrue);
      expect(seen.single.method, 'PATCH');
      expect(seen.single.data['paused'], isTrue);
    });

    test('pause toggle honors the server value', () async {
      final repo = ProfileRepository(
        mockApi((_) => {'data': {'paused': false}}),
      );

      expect(await repo.setDiscoveryPaused(true), isFalse);
    });
  });
}
