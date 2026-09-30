import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/session.dart';
import 'features/auth/session_provider.dart';
import 'l10n/locale_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
