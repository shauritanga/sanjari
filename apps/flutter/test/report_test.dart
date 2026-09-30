import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/profile/profile_view_repository.dart';
import 'package:sanjari/features/profile/report_repository.dart';

import 'mock_api.dart';

void main() {
  group('ReportRepository', () {
    test('submitReport posts the reason and description', () async {
      final seen = <RequestOptions>[];
      final repo = ReportRepository(mockApi((_) => {}, seen: seen));

      await repo.submitReport('u1', 'impersonation', 'Reported from profile view.');

      final request = seen.single;
      expect(request.path, endsWith('/reports'));
      final body = request.data as Map;
      expect(body['reportedUserId'], 'u1');
      expect(body['category'], 'impersonation');
      expect(body['description'], 'Reported from profile view.');
    });

    test('blockUser posts a reason to /blocks/:id', () async {
      final seen = <RequestOptions>[];
      final repo = ReportRepository(mockApi((_) => {}, seen: seen));

      await repo.blockUser('u1', 'Blocked from profile view.');

      final request = seen.single;
      expect(request.path, endsWith('/blocks/u1'));
      expect((request.data as Map)['reason'], 'Blocked from profile view.');
    });
  });

  group('ProfileViewRepository', () {
    test('fetchProfile parses the envelope', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileViewRepository(
        mockApi(
          (_) => {
            'data': {'id': 'u1', 'displayName': 'Amina'},
          },
          seen: seen,
        ),
      );

      final profile = await repo.fetchProfile('u1');

      expect(profile?.displayName, 'Amina');
      expect(seen.single.path, endsWith('/discovery/profile/u1'));
    });

    test('fetchProfile returns null without a profile envelope', () async {
      final repo = ProfileViewRepository(mockApi((_) => {}));
      expect(await repo.fetchProfile('u1'), isNull);
    });

    test('fetchSharedProfile parses the envelope', () async {
      final seen = <RequestOptions>[];
      final repo = ProfileViewRepository(
        mockApi(
          (_) => {
            'data': {'id': 'u1', 'displayName': 'Amina'},
          },
          seen: seen,
        ),
      );

      final profile = await repo.fetchSharedProfile('tok123');

      expect(profile?.displayName, 'Amina');
      expect(seen.single.path, endsWith('/discovery/share/tok123'));
    });

    test('fetchSharedProfile returns null without a profile envelope', () async {
      final repo = ProfileViewRepository(mockApi((_) => {}));
      expect(await repo.fetchSharedProfile('tok123'), isNull);
    });
  });
}
