import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sanjari/core/session.dart';
import 'package:sanjari/features/auth/email_page.dart';
import 'package:sanjari/features/auth/email_verification_page.dart';
import 'package:sanjari/features/auth/session_provider.dart';
import 'package:sanjari/features/onboarding/date_of_birth_page.dart';
import 'package:sanjari/features/onboarding/pending_dob_provider.dart';
import 'package:sanjari/l10n/locale_controller.dart';
import 'package:sanjari/widgets/app_button.dart';

/// Regression coverage for the "continue with email, not registered" flow
/// fix: registration must create the account/session via registerEmail +
/// verifyEmailRegistration (mirroring the phone flow), never the removed
/// requestEmailRegistrationCode/verifyEmailRegistrationCode pair, and must
/// never silently proceed without a date of birth.
class _FakeSession extends SessionController {
  bool accountExists = false;
  String? registeredEmail;
  DateTime? registeredDob;
  String? verifiedEmail;
  String? verifiedCode;

  @override
  AuthStatus get status => AuthStatus.unauthenticated;

  @override
  Future<bool> emailAccountExists(String email) async => accountExists;

  @override
  Future<void> registerEmail(
    String email,
    DateTime dateOfBirth,
    String locale,
  ) async {
    registeredEmail = email;
    registeredDob = dateOfBirth;
  }

  @override
  Future<PostAuthResult> verifyEmailRegistration(
    String email,
    String code,
  ) async {
    verifiedEmail = email;
    verifiedCode = code;
    return PostAuthResult(PostAuthDestination.onboarding, onboardingStep: 4);
  }
}

/// Minimal router carrying only the routes EmailPage's registration branch
/// can reach, avoiding the full SanjariApp router (whose top-level
/// redirect/app-lock logic is unrelated here and flaky under the test
/// harness independent of this change — see registration_birthday_test.dart
/// for the same pre-existing "deactivated widget" issue).
GoRouter _buildRouter() => GoRouter(
      initialLocation: '/auth/email',
      routes: [
        GoRoute(
          path: '/auth/email',
          builder: (context, state) => const EmailPage(),
        ),
        GoRoute(
          path: '/auth/email/verify',
          builder: (context, state) => const SizedBox.shrink(),
        ),
        GoRoute(
          path: '/onboarding/date-of-birth',
          builder: (context, state) => const DateOfBirthPage(),
        ),
      ],
    );

void main() {
  testWidgets('redirects to the date-of-birth gate when none is pending',
      (tester) async {
    final session = _FakeSession();
    final locales = LocaleController();
    await tester.pumpWidget(ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => session),
        localeProvider.overrideWith((ref) => locales),
        pendingDateOfBirthProvider.overrideWith((ref) => null),
      ],
      child: MaterialApp.router(routerConfig: _buildRouter()),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'new@example.com');
    await tester.tap(find.byType(AppButton));
    await tester.pumpAndSettle();

    expect(session.registeredEmail, isNull);
    expect(find.byType(DateOfBirthPage), findsOneWidget);
  });

  testWidgets('registers a new account once a date of birth is pending',
      (tester) async {
    final session = _FakeSession();
    final locales = LocaleController();
    final dob = DateTime(2000, 1, 1);
    await tester.pumpWidget(ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => session),
        localeProvider.overrideWith((ref) => locales),
        pendingDateOfBirthProvider.overrideWith((ref) => dob),
      ],
      child: MaterialApp.router(routerConfig: _buildRouter()),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'new@example.com');
    await tester.tap(find.byType(AppButton));
    await tester.pumpAndSettle();

    expect(session.registeredEmail, 'new@example.com');
    expect(session.registeredDob, dob);
  });

  testWidgets('verifies registration via verifyEmailRegistration',
      (tester) async {
    final session = _FakeSession();
    final locales = LocaleController();
    await tester.pumpWidget(ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => session),
        localeProvider.overrideWith((ref) => locales),
      ],
      child: const MaterialApp(
        home: EmailVerificationPage(
          email: 'new@example.com',
          registration: true,
        ),
      ),
    ));
    await tester.enterText(find.byType(TextField), '123456');
    await tester.pumpAndSettle();

    expect(session.verifiedEmail, 'new@example.com');
    expect(session.verifiedCode, '123456');
  });
}
