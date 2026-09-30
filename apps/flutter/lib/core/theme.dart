import 'package:flutter/material.dart';

// Brand tokens ported from packages/shared-utils/src/brand.ts and
// apps/mobile/src/theme/theme.ts. Manrope has no first-party Flutter
// package, so Nunito Sans (similar geometric-humanist feel) stands in
// until a Manrope font asset is added under fonts/.
class SanjariColors {
  static const coral = Color(0xFFE85D75);
  static const deepPlum = Color(0xFF4A2545);
  static const softGold = Color(0xFFF4B860);
  static const warmWhite = Color(0xFFFFF9F7);
  static const softRose = Color(0xFFFCEAEC);
  static const charcoal = Color(0xFF252126);
  static const secondaryText = Color(0xFF746B72);
  static const success = Color(0xFF2E9D73);
  static const error = Color(0xFFD64550);
  static const darkBackground = Color(0xFF171216);
  static const darkCard = Color(0xFF241C22);
  static const darkText = Color(0xFFFFF8FA);
  static const darkSecondaryText = Color(0xFFBDAFB8);
  static const darkCoral = Color(0xFFF06C82);
  static const darkPlum = Color(0xFF8C5B83);
}

class SanjariRadius {
  static const double sm = 6;
  static const double md = 8;
  static const double lg = 16;
  static const double xl = 24;
}

class SanjariSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

ThemeData sanjariLightTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: SanjariColors.coral,
    primary: SanjariColors.coral,
    secondary: SanjariColors.deepPlum,
    tertiary: SanjariColors.softGold,
    surface: Colors.white,
    error: SanjariColors.error,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: SanjariColors.warmWhite,
    fontFamily: 'NunitoSans',
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SanjariColors.coral,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SanjariRadius.lg),
        ),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SanjariRadius.lg),
        borderSide: const BorderSide(color: SanjariColors.softRose),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(SanjariRadius.lg),
        borderSide: const BorderSide(color: SanjariColors.softRose),
      ),
    ),
  );
}

ThemeData sanjariDarkTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: SanjariColors.darkCoral,
    brightness: Brightness.dark,
    primary: SanjariColors.darkCoral,
    secondary: SanjariColors.darkPlum,
    tertiary: SanjariColors.softGold,
    surface: SanjariColors.darkCard,
    error: SanjariColors.error,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: SanjariColors.darkBackground,
    fontFamily: 'NunitoSans',
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SanjariColors.darkCoral,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SanjariRadius.lg),
        ),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
  );
}
