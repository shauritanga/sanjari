import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'strings.dart';

export 'strings.dart';

/// Persists the language choice under the same key Expo uses
/// ('sanjari.language'). Failures are silent: the app keeps working with
/// the in-memory locale, mirroring how the Expo app treats storage errors.
class LanguageStore {
  static const storageKey = 'sanjari.language';

  Future<AppLocale?> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(storageKey);
      if (code == 'sw') return AppLocale.swahili;
      if (code == 'en') return AppLocale.english;
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> save(AppLocale locale) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(storageKey, locale.languageCode);
    } catch (_) {
      // Best-effort persistence only.
    }
  }
}

/// ChangeNotifier wrapper around [AppLocale] for locale switching.
class LocaleController extends ChangeNotifier {
  AppLocale _value = AppLocale.english;

  AppLocale get value => _value;

  Locale get locale => Locale(_value.languageCode);

  void set(AppLocale next) {
    if (next == _value) return;
    _value = next;
    notifyListeners();
  }
}

final localeProvider = ChangeNotifierProvider<LocaleController>((ref) {
  return LocaleController();
});
