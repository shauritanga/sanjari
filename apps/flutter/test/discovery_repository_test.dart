import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/discover/discovery_repository.dart';

import 'mock_api.dart';

void main() {
  group('DiscoveryRepository', () {
    test('fetchQueue parses candidates and cursor', () async {
      final seen = <RequestOptions>[];
      final repo = DiscoveryRepository(
        mockApi(
          (options) => {
            'data': [
              {'id': 'u1', 'displayName': 'Amina', 'age': 27},
              {'id': 'u2'},
            ],
            'nextCursor': 'cursor-1',
          },
          seen: seen,
        ),
      );

      final page = await repo.fetchQueue(
        recentlyActive: true,
        newMembers: true,
      );

      expect(page.candidates, hasLength(2));
      expect(page.candidates.first.safeName, 'Amina');
      expect(page.nextCursor, 'cursor-1');
      expect(seen.single.path, contains('/discovery'));
      expect(seen.single.path, contains('recentlyActive=true'));
      expect(seen.single.path, contains('newMembers=true'));
    });

    test('fetchQueue handles an empty envelope', () async {
      final repo = DiscoveryRepository(mockApi((_) => {}));
      final page = await repo.fetchQueue();

      expect(page.candidates, isEmpty);
      expect(page.nextCursor, isNull);
    });

    test('like posts priority and an idempotency key', () async {
      final seen = <RequestOptions>[];
      final repo = DiscoveryRepository(
        mockApi(
          (_) => {
            'data': {'liked': true, 'matched': false, 'likeId': 'l1'},
          },
          seen: seen,
        ),
      );

      final result = await repo.like('u1', priority: true);

      expect(result.liked, isTrue);
      expect(result.matched, isFalse);
      final request = seen.single;
      expect(request.path, endsWith('/discovery/u1/like'));
      final body = request.data as Map;
      expect(body['priority'], isTrue);
      expect(
        (body['idempotencyKey'] as String).startsWith('u1-'),
        isTrue,
      );
    });

    test('pass and undo hit the expected endpoints', () async {
      final seen = <RequestOptions>[];
      final repo = DiscoveryRepository(mockApi((_) => {}, seen: seen));

      await repo.pass('u1');
      await repo.undo('u1');

      expect(seen[0].path, endsWith('/discovery/u1/pass'));
      expect(seen[1].path, endsWith('/discovery/undo'));
      expect((seen[1].data as Map)['targetUserId'], 'u1');
    });

    test('preferences round-trip through the onboarding endpoints', () async {
      final seen = <RequestOptions>[];
      final repo = DiscoveryRepository(
        mockApi(
          (options) => {
            'data': {'minAge': 22, 'verifiedOnly': true},
          },
          seen: seen,
        ),
      );

      final preference = await repo.getPreferences();
      expect(preference.minAge, 22);
      expect(preference.verifiedOnly, isTrue);
      expect(seen.single.path, endsWith('/onboarding/discovery-preferences'));

      await repo.savePreferences(preference);
      expect(seen.last.method, 'PUT');
      expect(
        (seen.last.data as Map)['minAge'],
        22,
      );
    });
  });
}
