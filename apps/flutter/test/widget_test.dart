// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sanjari/features/onboarding/welcome_page.dart';

void main() {
  testWidgets('welcome screen starts onboarding', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: GoRouter(
          initialLocation: '/onboarding/welcome',
          routes: [
            GoRoute(
              path: '/onboarding/welcome',
              builder: (_, __) => const WelcomePage(),
            ),
            GoRoute(
              path: '/onboarding/age',
              builder: (_, __) => const Scaffold(body: Text('Age gate')),
            ),
            GoRoute(
              path: '/auth/login',
              builder: (_, __) => const Scaffold(body: Text('Login')),
            ),
          ],
        ),
      ),
    );

    expect(find.text('Sanjari'), findsOneWidget);
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();

    expect(find.text('Age gate'), findsOneWidget);
  });
}
