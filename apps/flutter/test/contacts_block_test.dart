import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/settings/contacts_block.dart';
import 'package:sanjari/features/settings/contacts_block_repository.dart';

import 'mock_api.dart';

void main() {
  group('normalizePhone', () {
    test('keeps valid E.164 numbers, stripping separators', () {
      expect(normalizePhone('+254 712 345 678'), '+254712345678');
      expect(normalizePhone('+1 (415) 555-0132'), '+14155550132');
      expect(normalizePhone('+44.7700.900077'), '+447700900077');
    });

    test('rejects missing plus, short, and overlong numbers', () {
      expect(normalizePhone('0712345678'), isNull);
      expect(normalizePhone('+2547123'), isNull);
      expect(normalizePhone('+1234567890123456'), isNull);
      expect(normalizePhone('+2547123456789'), '+2547123456789');
      expect(normalizePhone(''), isNull);
    });
  });

  group('hashContactNumbers', () {
    test('dedupes and skips invalid numbers', () {
      final hashes = hashContactNumbers([
        '+254712345678',
        '+254 712 345 678',
        'not-a-number',
        '+14155550132',
      ]);

      expect(hashes, hasLength(2));
      expect(hashes.toSet(), hasLength(2));
    });

    test('hashes match the Expo SHA-256 hex digests', () {
      // Fixture computed with coreutils sha256sum, independent of
      // package:crypto: printf '+254712345678' | sha256sum.
      expect(
        hashContactNumbers(['+254712345678']).single,
        '7e68ed1fbff891757a23ef26f54dd9de094c47613a21f736deb30c14b70e8127',
      );
    });
  });

  group('ContactsBlockRepository', () {
    test('posts hashes and returns the blocked count', () async {
      final seen = <RequestOptions>[];
      final repo = ContactsBlockRepository(
        mockApi(
          (_) => {
            'data': {'blockedCount': 3}
          },
          seen: seen,
        ),
      );

      final blocked = await repo.blockByHashes(['h1', 'h2']);

      expect(blocked, 3);
      expect(seen.single.path, '/contacts/block');
      expect(seen.single.method, 'POST');
      expect(seen.single.data['hashes'], ['h1', 'h2']);
    });

    test('missing counts read as zero', () async {
      final repo = ContactsBlockRepository(mockApi((_) => {'data': {}}));
      expect(await repo.blockByHashes(const []), 0);
    });
  });
}
