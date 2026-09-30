import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/settings/blocked_models.dart';
import 'package:sanjari/features/settings/blocked_repository.dart';

import 'mock_api.dart';

void main() {
  group('BlockedProfile', () {
    test('falls back to the member label for blank names', () {
      final named = BlockedProfile.fromJson({
        'id': 'b1',
        'blockedId': 'u9',
        'displayName': '  ',
        'photoUrl': 'https://x/y.jpg',
        'createdAt': '2026-09-01T10:00:00.000Z',
      });

      expect(named.safeName('Sanjari member'), 'Sanjari member');
      expect(named.photoUrl, 'https://x/y.jpg');
    });
  });

  group('BlockedRepository', () {
    test('fetches the list and unblocks by blocked id', () async {
      final seen = <RequestOptions>[];
      final repo = BlockedRepository(
        mockApi(
          (_) => {
            'data': [
              {
                'id': 'b1',
                'blockedId': 'u9',
                'displayName': 'Juma',
                'photoUrl': null,
                'createdAt': '2026-09-01T10:00:00.000Z',
              },
            ],
          },
          seen: seen,
        ),
      );

      final blocked = await repo.fetchBlocked();
      expect(blocked.single.safeName('?'), 'Juma');
      expect(seen.single.path, endsWith('/blocks'));

      await repo.unblock('u9');
      expect(seen.last.path, endsWith('/blocks/u9'));
      expect(seen.last.method, 'DELETE');
    });
  });
}
