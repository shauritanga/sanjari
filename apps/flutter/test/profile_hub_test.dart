import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/profile/profile_hub.dart';
import 'package:sanjari/features/profile/profile_repository.dart';

import 'mock_api.dart';

void main() {
  group('HubProfile', () {
    test('prefers the primary photo, falls back to first', () {
      final profile = HubProfile.fromJson({
        'displayName': 'Amina',
        'city': 'Dar es Salaam',
        'photos': [
          {'id': 'p1', 'url': 'https://x/1.jpg', 'isPrimary': false},
          {'id': 'p2', 'url': 'https://x/2.jpg', 'isPrimary': true},
        ],
      });

      expect(profile.safeName, 'Amina');
      expect(profile.initial, 'A');
      expect(profile.primaryPhoto?.id, 'p2');
    });

    test('blank names fall back to placeholders', () {
      const profile = HubProfile();

      expect(profile.safeName, 'Your profile');
      expect(profile.initial, 'S');
      expect(profile.primaryPhoto, isNull);
    });
  });

  group('hub labels', () {
    test('publish status keys cover every onboarding state', () {
      expect(publishStatusKey('published'), 'liveStatus');
      expect(publishStatusKey('in_progress'), 'draftStatus');
      expect(publishStatusKey('not_started'), 'notStarted');
      expect(publishStatusKey('anything-else'), 'notStarted');
    });

    test('member-since label formats month and year', () {
      expect(
        memberSinceLabel('2024-06-15T10:00:00.000Z'),
        contains('2024'),
      );
      expect(memberSinceLabel(null), isNull);
      expect(memberSinceLabel(''), isNull);
      expect(memberSinceLabel('not-a-date'), isNull);
    });

    test('latestVerificationFor picks the first matching type', () {
      final cases = [
        const VerificationCase(
          id: 'c1',
          type: 'selfie_liveness',
          status: 'approved',
        ),
        const VerificationCase(
          id: 'c2',
          type: 'identity_document',
          status: 'pending',
        ),
      ];

      expect(
        latestVerificationFor(cases, 'identity_document')?.approved,
        isFalse,
      );
      expect(
        latestVerificationFor(cases, 'selfie_liveness')?.approved,
        isTrue,
      );
      expect(latestVerificationFor(cases, 'unknown'), isNull);
    });
  });

  group('ProfileRepository', () {
    test('fetches onboarding state and verification cases', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileRepository(
        mockApi(
          (options) => options.path.endsWith('/onboarding/verification')
              ? {
                  'data': [
                    {
                      'id': 'c1',
                      'type': 'selfie_liveness',
                      'status': 'approved',
                    },
                  ],
                }
              : {
                  'data': {
                    'completionScore': 80,
                    'onboardingStatus': 'published',
                    'age': 27,
                    'memberSince': '2024-06-15T10:00:00.000Z',
                    'profile': {
                      'displayName': 'Amina',
                      'city': 'Dar es Salaam',
                      'photos': [],
                    },
                  },
                },
          seen: seen,
        ),
      );

      final state = await repo.fetchOnboarding();
      expect(state.completionScore, 80);
      expect(state.onboardingStatus, 'published');
      expect(state.profile.safeName, 'Amina');

      final cases = await repo.fetchVerificationCases();
      expect(cases.single.approved, isTrue);

      expect(seen[0].path, endsWith('/onboarding'));
      expect(
        seen[1].path,
        endsWith('/onboarding/verification'),
      );
    });
  });
}
