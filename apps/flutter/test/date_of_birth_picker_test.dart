import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sanjari/app.dart';
import 'package:sanjari/core/session.dart';
import 'package:sanjari/features/auth/session_provider.dart';
import 'package:sanjari/features/onboarding/pending_dob_provider.dart';
import 'package:sanjari/l10n/locale_controller.dart';

class LoggedOutSession extends SessionController {
  @override
  AuthStatus get status => AuthStatus.unauthenticated;
}

void main() {
  for (final locale in AppLocale.values) {
    for (final underage in [false, true]) {
      testWidgets('$locale picker opens and validates underage=$underage',
          (tester) async {
        final session = LoggedOutSession();
        final locales = LocaleController()..set(locale);
        final now = DateTime.now();
        final birthday = DateTime(now.year - (underage ? 17 : 25), 1, 1);
        await tester.pumpWidget(ProviderScope(
          overrides: [
            sessionProvider.overrideWith((ref) => session),
            localeProvider.overrideWith((ref) => locales),
            pendingDateOfBirthProvider.overrideWith((ref) => birthday),
          ],
          child: SanjariApp(session: session, locales: locales),
        ));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Get started'));
        await tester.pumpAndSettle();
        await tester.tap(find.text("I'm 18 or older"));
        await tester.pumpAndSettle();
        await tester.tap(find.byType(OutlinedButton));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(CupertinoDatePicker), findsOneWidget);
        await tester.tap(find.byKey(const ValueKey('confirm-date-of-birth')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(CupertinoDatePicker), findsNothing);
        expect(
            find.byType(AlertDialog), underage ? findsOneWidget : findsNothing);
        if (underage) {
          expect(find.text(tr(locale, 'under18Title')), findsOneWidget);
          await tester.tap(find.text(tr(locale, 'goBack')));
          await tester.pumpAndSettle();
        } else {
          await tester.tap(find.byType(OutlinedButton));
          await tester.pumpAndSettle();
          expect(
              tester
                  .widget<CupertinoDatePicker>(find.byType(CupertinoDatePicker))
                  .initialDateTime,
              birthday);
        }
      });
    }
  }
}
