import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/settings/chaperone_models.dart';
import 'package:sanjari/features/settings/chaperone_repository.dart';

import 'mock_api.dart';

void main() {
  group('chaperone form validation', () {
    test('requires name, relationship, and an @ email', () {
      expect(
        chaperoneFormValid('Amina', 'Mother', 'a@example.com'),
        isTrue,
      );
      expect(chaperoneFormValid('  ', 'Mother', 'a@example.com'), isFalse);
      expect(chaperoneFormValid('Amina', '', 'a@example.com'), isFalse);
      expect(
        chaperoneFormValid('Amina', 'Mother', 'not-an-email'),
        isFalse,
      );
    });
  });

  group('ChaperoneRepository', () {
    test('fetches, saves, and removes the chaperone', () async {
      final seen = <RequestOptions>[];
      final repo = ChaperoneRepository(
        mockApi(
          (_) => {
            'data': {
              'name': 'Amina',
              'relationship': 'Mother',
              'email': 'a@example.com',
              'forwardEnabled': true,
            },
          },
          seen: seen,
        ),
      );

      final chaperone = await repo.fetchChaperone();
      expect(chaperone?.name, 'Amina');
      expect(chaperone?.forwardEnabled, isTrue);
      expect(seen.single.path, endsWith('/onboarding/chaperone'));

      const updated = Chaperone(
        name: 'Amina',
        relationship: 'Wali',
        email: 'a@example.com',
        forwardEnabled: false,
      );
      await repo.saveChaperone(updated);
      expect(seen[1].method, 'PUT');
      expect(
        (seen[1].data as Map)['relationship'],
        'Wali',
      );

      await repo.removeChaperone();
      expect(seen.last.method, 'DELETE');
      expect(
        seen.last.path,
        endsWith('/onboarding/chaperone'),
      );
    });

    test('returns null when no chaperone is set', () async {
      final repo = ChaperoneRepository(mockApi((_) => {'data': null}));

      expect(await repo.fetchChaperone(), isNull);
    });
  });
}
