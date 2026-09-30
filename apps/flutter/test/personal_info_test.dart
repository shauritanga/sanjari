import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/settings/personal_info_models.dart';
import 'package:sanjari/features/settings/personal_info_repository.dart';

import 'mock_api.dart';

void main() {
  group('personal info models', () {
    test('parses identity details with nested profile', () {
      final info = PersonalInfo.fromJson({
        'email': 'a@example.com',
        'phoneNumber': '+255700000000',
        'dateOfBirth': '1999-06-15T00:00:00.000Z',
        'profile': {'displayName': 'Amina', 'gender': 'woman'},
      });

      expect(info.email, 'a@example.com');
      expect(info.phoneNumber, '+255700000000');
      expect(info.displayName, 'Amina');
      expect(
        info.copyWith(phoneNumber: '+255711111111').phoneNumber,
        '+255711111111',
      );
    });

    test('birth dates render long-form, blank when unparseable', () {
      expect(
        formatBirthDate('1999-06-15T00:00:00.000Z'),
        contains('1999'),
      );
      expect(formatBirthDate('bogus'), '');
    });

    test('entry gates mirror the Expo disabled rules', () {
      expect(phoneEntryValid('+2557000'), isTrue);
      expect(phoneEntryValid('  123  '), isFalse);
      expect(emailEntryValid('a@example.com'), isTrue);
      expect(emailEntryValid('no-at-sign'), isFalse);
      expect(codeValid('1234'), isTrue);
      expect(codeValid('123'), isFalse);
    });
  });

  group('PersonalInfoRepository', () {
    test('loads details and runs both change flows', () async {
      final seen = <RequestOptions>[];
      final repo = PersonalInfoRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/onboarding')) {
              return {
                'data': {
                  'email': 'a@example.com',
                  'phoneNumber': null,
                  'dateOfBirth': '1999-06-15T00:00:00.000Z',
                  'profile': {'displayName': null, 'gender': null},
                },
              };
            }
            if (options.path.endsWith('/auth/email/change/confirm')) {
              return {
                'data': {'email': 'b@example.com'},
              };
            }
            return {'data': null};
          },
          seen: seen,
        ),
      );

      final info = await repo.fetchInfo();
      expect(info?.phoneNumber, isNull);

      await repo.requestPhoneChange('+255700000000');
      await repo.confirmPhoneChange('+255700000000', '123456');
      await repo.requestEmailChange('b@example.com');
      expect(
        await repo.confirmEmailChange('b@example.com', '654321'),
        'b@example.com',
      );

      final calls = seen.map((r) => '${r.method} ${r.path}').toList();
      expect(calls, contains('GET /onboarding'));
      expect(calls, contains('POST /auth/phone/request'));
      expect(calls, contains('POST /auth/phone/verify'));
      expect(calls, contains('POST /auth/email/change/request'));
      expect(calls, contains('POST /auth/email/change/confirm'));
    });

    test('email confirm throws without a confirmed address', () async {
      final repo = PersonalInfoRepository(mockApi((_) => {'data': null}));

      expect(
        repo.confirmEmailChange('b@example.com', '000000'),
        throwsA(isA<Exception>()),
      );
    });
  });
}
