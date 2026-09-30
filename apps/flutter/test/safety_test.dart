import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/safety/safety_models.dart';
import 'package:sanjari/features/safety/safety_repository.dart';

import 'mock_api.dart';

void main() {
  group('safety models', () {
    test('guidance parses sections, tolerates absence', () {
      final guidance = Guidance.fromJson({
        'title': 'Stay safe',
        'sections': [
          {'key': 'scams', 'title': 'Scams', 'body': 'Never send money.'},
        ],
      });

      expect(guidance.title, 'Stay safe');
      expect(guidance.sections.single.key, 'scams');
      expect(Guidance.fromJson(null).sections, isEmpty);
    });

    test('appeal cases track submission state', () {
      final open = AppealCase.fromJson({
        'id': 'c1',
        'status': 'open',
        'report': {'category': 'spam', 'appealStatus': null},
      });
      expect(open.canAppeal, isTrue);

      final submitted = open.markSubmitted();
      expect(submitted.canAppeal, isFalse);
      expect(submitted.report.appealStatus, 'submitted');
    });
  });

  group('SafetyRepository', () {
    test('loads guidance with locale and open appeals', () async {
      final seen = <RequestOptions>[];
      final repo = SafetyRepository(
        mockApi(
          (options) {
            if (options.path.contains('/safety/guidance')) {
              return {
                'data': {'title': 'Usalama', 'sections': []},
              };
            }
            return {
              'data': [
                {
                  'id': 'c1',
                  'status': 'open',
                  'report': {'category': 'spam'},
                },
              ],
            };
          },
          seen: seen,
        ),
      );

      final guidance = await repo.fetchGuidance('sw');
      expect(guidance?.title, 'Usalama');
      expect(seen.first.path, contains('locale=sw'));

      final appeals = await repo.fetchAppeals();
      expect(appeals.single.canAppeal, isTrue);
    });

    test('mutations hit the expected endpoints and bodies', () async {
      final seen = <RequestOptions>[];
      final repo = SafetyRepository(
        mockApi((_) => {'data': {'status': 'requested'}}, seen: seen),
      );

      await repo.submitAppeal('c1', 'My statement');
      expect(
        (seen[0].data as Map)['statement'],
        'My statement',
      );

      expect(await repo.requestExport(), 'requested');
      await repo.deactivate();
      expect(await repo.requestDeletion(), 'requested');

      final calls = seen.map((r) => '${r.method} ${r.path}').toList();
      expect(
        calls,
        contains('POST /moderation/cases/c1/appeals'),
      );
      expect(calls, contains('POST /safety/data-export'));
      expect(calls, contains('POST /safety/account-deactivation'));
      expect(calls, contains('POST /safety/account-deletion'));
    });

    test('missing status words fall back to defaults', () async {
      final repo = SafetyRepository(mockApi((_) => {'data': null}));

      expect(await repo.requestExport(), 'requested');
      expect(await repo.requestDeletion(), 'scheduled');
    });
  });
}
