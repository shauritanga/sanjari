import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/passcode.dart';
import 'core/passcode_devices.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'features/auth/app_lock.dart';
import 'features/auth/lock_page.dart';
import 'features/auth/login_page.dart';
import 'features/auth/email_page.dart';
import 'features/auth/email_verification_page.dart';
import 'features/auth/password_reset_page.dart';
import 'features/auth/phone_page.dart';
import 'features/auth/phone_verification_page.dart';
import 'features/auth/signup_page.dart';
import 'features/auth/verify_email_page.dart';
import 'features/chat/chat_page.dart';
import 'features/discover/filters_page.dart';
import 'features/home/home_shell.dart';
import 'features/legal/legal_docs.dart';
import 'features/legal/legal_page.dart';
import 'features/onboarding/age_page.dart';
import 'features/onboarding/date_of_birth_page.dart';
import 'features/onboarding/bio_page.dart';
import 'features/onboarding/birthday_page.dart';
import 'features/onboarding/city_page.dart';
import 'features/onboarding/country_page.dart';
import 'features/onboarding/discovery_preferences_page.dart';
import 'features/onboarding/gender_page.dart';
import 'features/onboarding/intentions_page.dart';
import 'features/onboarding/min_max_chips_page.dart';
import 'features/onboarding/location_page.dart';
import 'features/onboarding/name_page.dart';
import 'features/onboarding/notifications_page.dart';
import 'features/onboarding/photos_page.dart';
import 'features/onboarding/privacy_page.dart';
import 'features/onboarding/prompts_page.dart';
import 'features/onboarding/publish_page.dart';
import 'features/onboarding/pending_dob_provider.dart';
import 'features/onboarding/review_page.dart';
import 'features/onboarding/verification_page.dart';
import 'features/onboarding/voice_intro_page.dart';
import 'features/onboarding/registration_method_page.dart';
import 'features/onboarding/terms_page.dart';
import 'features/onboarding/welcome_page.dart';
import 'features/onboarding/who_to_meet_page.dart';
import 'features/onboarding/onboarding_steps.dart';
import 'features/premium/premium_page.dart';
import 'features/profile/block_page.dart';
import 'features/profile/profile_edit_page.dart';
import 'features/profile/profile_view_page.dart';
import 'features/profile/preview_page.dart';
import 'features/profile/report_page.dart';
import 'features/profile/shared_profile_page.dart';
import 'features/safety/safety_page.dart';
import 'features/settings/passcode_page.dart';
import 'features/settings/personal_info_page.dart';
import 'features/settings/chaperone_page.dart';
import 'features/settings/blocked_page.dart';
import 'features/settings/contacts_block_page.dart';
import 'features/settings/settings_page.dart';
import 'features/splash/splash_page.dart';
import 'l10n/locale_controller.dart';

/// Route map. Expo Router file routes -> go_router table:
///   index.tsx            -> /splash
///   (auth)/*             -> /auth/*
///   (tabs)/*             -> /home/:tab
///   filters.tsx          -> /filters
///   profile/edit         -> /profile/edit (ProfileEditPage)
///   profile/preview      -> /profile/preview (PreviewPage)
///   profile/report       -> /profile/report (ReportProfilePage)
///   profile/block        -> /profile/block (BlockProfilePage)
///   profile/share/[token] -> /profile/share/:token (SharedProfilePage)
///   profile/[id]          -> /profile/:id (ProfileViewPage)
///   settings(.tsx)       -> /settings (SettingsPage)
///   safety.tsx           -> /safety (SafetyPage)
///   conversation/[id]    -> /conversation/:id (ChatPage)
///   match-celebration    -> MatchDialog (dialog, not a route)
///   onboarding/* -> /onboarding/<step> (Phases 14-17, all 23 steps);
///   /onboarding?step= remains as the legacy stub target
GoRouter buildRouter(SessionController session, LocaleController locales) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: Listenable.merge([session, locales]),
    redirect: (context, state) async {
      final status = session.status;
      final location = state.matchedLocation;
      final onSplash = location == '/splash';
      final onAuth = location.startsWith('/auth');
      final onOnboarding = location.startsWith('/onboarding');
      final onLegal = location.startsWith('/legal');
      final onLock = location == '/lock';

      if (status == AuthStatus.unknown) return onSplash ? null : '/splash';
      if (status == AuthStatus.unauthenticated) {
        final registering = location == '/auth/signup' ||
            (location == '/auth/phone' &&
                state.uri.queryParameters['from'] == 'signup');
        if (registering &&
            ProviderScope.containerOf(context)
                    .read(pendingDateOfBirthProvider) ==
                null) {
          return '/onboarding/date-of-birth';
        }
        return onAuth || onOnboarding || onLegal ? null : '/onboarding/welcome';
      }
      // Authenticated.
      if (onSplash || onAuth) return session.startupLocation;
      if (onLock) return null;
      // Cold-start app lock, mirroring the splash gate in
      // apps/mobile/app/index.tsx: an enabled passcode reroutes every
      // launch to /lock until this session unlocks.
      final container = ProviderScope.containerOf(context);
      if (container.read(appLockGateProvider)) return null;
      final store = PasscodeStore(
        storage: SecurePasscodeStorage(),
        biometrics: LocalAuthBiometrics(),
      );
      if (await store.isPasscodeEnabled()) {
        return '/lock?next=${Uri.encodeComponent(location)}';
      }
      container.read(appLockGateProvider.notifier).state = true;
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/email',
        builder: (context, state) => const EmailPage(),
      ),
      GoRoute(
        path: '/auth/email/verify',
        builder: (context, state) => EmailVerificationPage(
          email: state.uri.queryParameters['email'] ?? '',
          registration: state.uri.queryParameters['mode'] == 'register',
        ),
      ),
      GoRoute(
        path: '/onboarding/welcome',
        builder: (context, state) => const WelcomePage(),
      ),
      GoRoute(
        path: '/lock',
        builder: (context, state) => LockPage(
          next: state.uri.queryParameters['next'] ?? '/home/discover',
        ),
      ),
      GoRoute(
        path: '/auth/signup',
        builder: (context, state) => const SignupPage(),
      ),
      GoRoute(
        path: '/auth/phone',
        builder: (context, state) => PhonePage(
          from: state.uri.queryParameters['from'] ?? 'login',
        ),
      ),
      GoRoute(
        path: '/auth/verify-email',
        builder: (context, state) => const VerifyEmailPage(),
      ),
      GoRoute(
        path: '/auth/verify-phone',
        builder: (context, state) => PhoneVerificationPage(
          phoneNumber: state.uri.queryParameters['phone'] ?? '',
          from: state.uri.queryParameters['from'] ?? 'login',
        ),
      ),
      GoRoute(
        path: '/auth/password-reset',
        builder: (context, state) => const PasswordResetPage(),
      ),
      GoRoute(
        path: '/home',
        redirect: (context, state) => '/home/discover',
      ),
      GoRoute(
        path: '/home/:tab',
        builder: (context, state) =>
            HomeShell(tab: state.pathParameters['tab'] ?? 'discover'),
      ),
      GoRoute(
        path: '/filters',
        builder: (context, state) => const FiltersPage(),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const ProfileEditPage(),
      ),
      GoRoute(
        path: '/profile/preview',
        builder: (context, state) => const PreviewPage(),
      ),
      GoRoute(
        path: '/profile/report',
        builder: (context, state) => ReportProfilePage(
          userId: state.uri.queryParameters['userId'] ?? '',
          mode: state.uri.queryParameters['mode'] ?? 'report',
          exitSteps:
              int.tryParse(state.uri.queryParameters['exitSteps'] ?? '') ?? 1,
        ),
      ),
      GoRoute(
        path: '/profile/block',
        builder: (context, state) => BlockProfilePage(
          userId: state.uri.queryParameters['userId'] ?? '',
          displayName: state.uri.queryParameters['displayName'],
          photoUrl: state.uri.queryParameters['photoUrl'],
          exitSteps:
              int.tryParse(state.uri.queryParameters['exitSteps'] ?? '') ?? 1,
        ),
      ),
      GoRoute(
        path: '/profile/share/:token',
        builder: (context, state) => SharedProfilePage(
          token: state.pathParameters['token'] ?? '',
        ),
      ),
      GoRoute(
        path: '/profile/:id',
        builder: (context, state) => ProfileViewPage(
          userId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/settings/personal-info',
        builder: (context, state) => const PersonalInfoPage(),
      ),
      GoRoute(
        path: '/settings/passcode',
        builder: (context, state) => const PasscodePage(),
      ),
      GoRoute(
        path: '/settings/chaperone',
        builder: (context, state) => const ChaperonePage(),
      ),
      GoRoute(
        path: '/settings/blocked',
        builder: (context, state) => const BlockedPage(),
      ),
      GoRoute(
        path: '/settings/contacts-block',
        builder: (context, state) => const ContactsBlockPage(),
      ),
      GoRoute(
        path: '/settings/legal/terms',
        builder: (context, state) => const LegalPage(
          titleKey: 'termsOfService',
          sections: termsSections,
        ),
      ),
      GoRoute(
        path: '/settings/legal/privacy-policy',
        builder: (context, state) => const LegalPage(
          titleKey: 'privacyPolicy',
          sections: privacySections,
        ),
      ),
      GoRoute(
        path: '/legal/terms',
        builder: (context, state) => const LegalPage(
          titleKey: 'termsOfService',
          sections: termsSections,
        ),
      ),
      GoRoute(
        path: '/legal/privacy-policy',
        builder: (context, state) => const LegalPage(
          titleKey: 'privacyPolicy',
          sections: privacySections,
        ),
      ),
      GoRoute(
        path: '/premium',
        builder: (context, state) => const PremiumPage(),
      ),
      GoRoute(
        path: '/safety',
        builder: (context, state) => const SafetyPage(),
      ),
      GoRoute(
        path: '/conversation/:id',
        builder: (context, state) => ChatPage(
          conversationId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: '/onboarding/age',
        builder: (context, state) => const AgePage(),
      ),
      GoRoute(
        path: '/onboarding/date-of-birth',
        builder: (context, state) => const DateOfBirthPage(),
      ),
      GoRoute(
        path: '/onboarding/terms',
        builder: (context, state) => const TermsPage(),
      ),
      GoRoute(
        path: '/onboarding/registration-method',
        builder: (context, state) => const RegistrationMethodPage(),
      ),
      GoRoute(
        path: '/onboarding/birthday',
        builder: (context, state) => const BirthdayPage(),
      ),
      GoRoute(
        path: '/onboarding/gender',
        builder: (context, state) => const GenderPage(),
      ),
      GoRoute(
        path: '/onboarding/who-to-meet',
        builder: (context, state) => const WhoToMeetPage(),
      ),
      GoRoute(
        path: '/onboarding/intentions',
        builder: (context, state) => const IntentionsPage(),
      ),
      GoRoute(
        path: '/onboarding/name',
        builder: (context, state) => const NamePage(),
      ),
      GoRoute(
        path: '/onboarding/country',
        builder: (context, state) => const CountryPage(),
      ),
      GoRoute(
        path: '/onboarding/city',
        builder: (context, state) => CityPage(
          countryCode: state.uri.queryParameters['countryCode'] ?? '',
        ),
      ),
      GoRoute(
        path: '/onboarding/bio',
        builder: (context, state) => const BioPage(),
      ),
      GoRoute(
        path: '/onboarding/interests',
        builder: (context, state) => const InterestsPage(),
      ),
      GoRoute(
        path: '/onboarding/prompts',
        builder: (context, state) => const PromptsPage(),
      ),
      GoRoute(
        path: '/onboarding/languages',
        builder: (context, state) => const LanguagesPage(),
      ),
      GoRoute(
        path: '/onboarding/photos',
        builder: (context, state) => const PhotosPage(),
      ),
      GoRoute(
        path: '/onboarding/discovery-preferences',
        builder: (context, state) => const DiscoveryPreferencesPage(),
      ),
      GoRoute(
        path: '/onboarding/location',
        builder: (context, state) => const LocationPage(),
      ),
      GoRoute(
        path: '/onboarding/verification',
        builder: (context, state) => const VerificationPage(),
      ),
      GoRoute(
        path: '/onboarding/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/onboarding/voice-intro',
        builder: (context, state) => const VoiceIntroPage(),
      ),
      GoRoute(
        path: '/onboarding/privacy',
        builder: (context, state) => const PrivacyPage(),
      ),
      GoRoute(
        path: '/onboarding/review',
        builder: (context, state) => const ReviewPage(),
      ),
      GoRoute(
        path: '/onboarding/publish',
        builder: (context, state) => const PublishPage(),
      ),
      GoRoute(
        path: '/onboarding',
        redirect: (context, state) {
          final step =
              int.tryParse(state.uri.queryParameters['step'] ?? '1') ?? 1;
          return resumeOnboardingPath(step);
        },
      ),
    ],
  );
}

class SanjariApp extends StatelessWidget {
  const SanjariApp({
    super.key,
    required this.session,
    required this.locales,
  });

  final SessionController session;
  final LocaleController locales;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: locales,
      builder: (context, _) {
        return MaterialApp.router(
          title: 'Sanjari',
          debugShowCheckedModeBanner: false,
          theme: sanjariLightTheme(),
          darkTheme: sanjariDarkTheme(),
          locale: locales.locale,
          supportedLocales: const [Locale('en'), Locale('sw')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          routerConfig: buildRouter(session, locales),
        );
      },
    );
  }
}
