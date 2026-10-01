import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'app.dart';
import 'core/session.dart';
import 'features/auth/session_provider.dart';
import 'firebase_options.dart';
import 'l10n/locale_controller.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {
    // Platform Firebase configuration is optional in local builds.
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (_) {
    // Keep local builds usable until Firebase project files are configured.
  }
  final session = SessionController();
  await session.initialize();
  final locales = LocaleController();
  final savedLocale = await LanguageStore().load();
  if (savedLocale != null) locales.set(savedLocale);
  runApp(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => session),
        localeProvider.overrideWith((ref) => locales),
      ],
      child: SanjariApp(session: session, locales: locales),
    ),
  );
}
