import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sanjari/app.dart';
import 'package:sanjari/core/api_client.dart';
import 'package:sanjari/core/session.dart';
import 'package:sanjari/features/auth/phone_page.dart';
import 'package:sanjari/features/auth/signup_page.dart';
import 'package:sanjari/features/auth/session_provider.dart';
import 'package:sanjari/features/onboarding/date_of_birth_page.dart';
import 'package:sanjari/features/onboarding/pending_dob_provider.dart';
import 'package:sanjari/l10n/locale_controller.dart';
import 'package:sanjari/widgets/app_button.dart';

class RecordingApi extends ApiClient {
  Object? payload;
  @override
  Future<Map<String, dynamic>> post(String path, [Object? data]) async {
    payload = data;
    return {};
  }
}

class RegistrationSession extends SessionController {
  final recordingApi = RecordingApi();
  DateTime? phoneBirthday;
  @override
  AuthStatus get status => AuthStatus.unauthenticated;
  @override
  ApiClient get api => recordingApi;
  @override
  Future<void> registerPhone(
      String phone, DateTime birthday, String locale) async {
    phoneBirthday = birthday;
  }
}

void main() {
  for (final phone in [false, true]) {
    for (final hasBirthday in [false, true]) {
      testWidgets(
          'registration phone=$phone uses earlier birthday=$hasBirthday',
          (tester) async {
        final session = RegistrationSession();
        final locales = LocaleController();
        final birthday = DateTime(2000, 2, 29);
        await tester.pumpWidget(ProviderScope(
          overrides: [
            sessionProvider.overrideWith((ref) => session),
            localeProvider.overrideWith((ref) => locales),
            pendingDateOfBirthProvider
                .overrideWith((ref) => hasBirthday ? birthday : null),
          ],
          child: SanjariApp(session: session, locales: locales),
        ));
        await tester.pumpAndSettle();
        final router = tester
            .widget<MaterialApp>(find.byType(MaterialApp))
            .routerConfig! as GoRouter;
        router.go(phone ? '/auth/phone?from=signup' : '/auth/signup');
        await tester.pumpAndSettle();
        if (!hasBirthday) {
          expect(find.byType(DateOfBirthPage), findsOneWidget);
          router.go('/auth/phone');
          await tester.pumpAndSettle();
          expect(find.byType(PhonePage), findsOneWidget);
          return;
        }
        expect(find.byType(phone ? PhonePage : SignupPage), findsOneWidget);
        expect(find.byIcon(Icons.calendar_today_outlined), findsNothing);
        expect(find.text(tr(AppLocale.english, 'dateOfBirth')), findsNothing);
        await tester.enterText(find.byType(TextField).first,
            phone ? '+255700000000' : 'test@example.com');
        if (!phone) {
          await tester.enterText(
              find.byType(TextField).last, 'Test-password-123');
        }
        await tester.ensureVisible(find.byType(AppButton));
        await tester.tap(find.byType(AppButton));
        await tester.pumpAndSettle();
        if (phone) {
          expect(session.phoneBirthday, birthday);
          expect(find.text(tr(AppLocale.english, 'verificationCode')),
              findsOneWidget);
        } else {
          expect((session.recordingApi.payload as Map)['dateOfBirth'],
              '2000-02-29');
        }
        expect(tester.takeException(), isNull);
      });
    }
  }
}
