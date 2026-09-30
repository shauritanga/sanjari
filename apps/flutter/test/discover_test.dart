import 'package:test/test.dart';
import 'package:sanjari/features/discover/candidate.dart';
import 'package:sanjari/features/discover/discovery_repository.dart';

void main() {
  group('Candidate.fromJson', () {
    test('parses a full candidate payload', () {
      final candidate = Candidate.fromJson({
        'id': 'user-1',
        'displayName': 'Amina',
        'age': 27,
        'city': 'Dar es Salaam',
        'countryCode': 'TZ',
        'countryName': 'Tanzania',
        'occupationCategory': 'Engineering',
        'distanceCategory': 'within_25km',
        'verificationStatus': 'verified',
        'verification': {
          'photoVerified': true,
          'ageVerified': false,
          'idVerified': false,
        },
        'primaryPhoto': {'id': 'photo-1', 'url': 'https://x/y.jpg'},
      });

      expect(candidate.id, 'user-1');
      expect(candidate.safeName, 'Amina');
      expect(candidate.age, 27);
      expect(candidate.verification.photoVerified, isTrue);
      expect(candidate.verification.anyVerified, isTrue);
      expect(candidate.primaryPhoto?.url, 'https://x/y.jpg');
    });

    test('tolerates a minimal payload', () {
      final candidate = Candidate.fromJson({'id': 'user-2'});

      expect(candidate.safeName, 'Sanjari member');
      expect(candidate.age, isNull);
      expect(candidate.verification.anyVerified, isFalse);
      expect(candidate.primaryPhoto, isNull);
      expect(candidate.distanceCategory, '');
    });
  });

  group('distanceLabel', () {
    test('covers every known category', () {
      expect(distanceLabel('not_shared'), 'Location private');
      expect(distanceLabel('nearby'), 'Nearby');
      expect(distanceLabel('within_25km'), 'Within 25 km');
      expect(distanceLabel('within_50km'), 'Within 50 km');
      expect(distanceLabel('farther_away'), 'Farther away');
      expect(distanceLabel('bogus'), 'Distance unknown');
      expect(distanceLabel(''), 'Distance unknown');
    });
  });

  group('LikeResult.fromJson', () {
    test('parses a matched like with user details', () {
      final result = LikeResult.fromJson({
        'liked': true,
        'matched': true,
        'matchId': 'match-1',
        'conversationId': 'conv-1',
        'likeId': 'like-1',
        'matchedUser': {
          'id': 'user-9',
          'displayName': 'Juma',
          'primaryPhoto': {'id': 'p-1', 'url': 'https://x/z.jpg'},
        },
      });

      expect(result.matched, isTrue);
      expect(result.conversationId, 'conv-1');
      expect(result.matchedUser?.displayName, 'Juma');
    });
  });

  group('DiscoveryPreference', () {
    test('merges partial server payloads onto defaults', () {
      final preference = DiscoveryPreference.fromJson({
        'minAge': 21,
        'genders': ['woman'],
        'unknownField': true,
      });

      expect(preference.minAge, 21);
      expect(preference.maxAge, 80);
      expect(preference.maxDistanceKm, 50);
      expect(preference.genders, ['woman']);
      expect(preference.showDistance, isTrue);
    });

    test('round-trips through JSON', () {
      const preference = DiscoveryPreference(
        minAge: 20,
        maxAge: 35,
        verifiedOnly: true,
      );
      final restored = DiscoveryPreference.fromJson(preference.toJson());

      expect(restored.minAge, 20);
      expect(restored.maxAge, 35);
      expect(restored.verifiedOnly, isTrue);
    });
  });
}
