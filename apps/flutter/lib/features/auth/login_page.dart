import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import 'session_provider.dart';

/// Email + password login. Port of apps/mobile/app/(auth)/login.tsx.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final strings = ref.watch(localeProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = ref.read(sessionProvider);
      final result = await session.loginWithEmail(
        _email.text.trim(),
        _password.text,
      );
      if (!mounted) return;
      if (result.destination == PostAuthDestination.home) {
        context.go('/home');
      } else {
        context.go('/onboarding?step=${result.onboardingStep}');
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = tr(strings.value, 'requestFailed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          children: [
            const SizedBox(height: SanjariSpacing.xl),
            Text(
              tr(locale, 'loginTitle'),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: SanjariSpacing.xs),
            Text(tr(locale, 'loginCopy')),
            const SizedBox(height: SanjariSpacing.lg),
            AppTextField(
              label: tr(locale, 'email'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: SanjariSpacing.md),
            AppTextField(
              label: tr(locale, 'password'),
              controller: _password,
              obscureText: true,
              error: _error,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            AppButton(
              label: tr(locale, _busy ? 'loggingIn' : 'login'),
              busy: _busy,
              onPressed: _submit,
            ),
            TextButton(
              onPressed: () => context.go('/auth/password-reset'),
              child: Text(tr(locale, 'forgotPassword')),
            ),
            TextButton(
              onPressed: () => context.go('/auth/phone'),
              child: Text(tr(locale, 'usePhone')),
            ),
            TextButton(
              onPressed: () => context.go('/auth/signup'),
              child: Text(tr(locale, 'needAccount')),
            ),
          ],
        ),
      ),
    );
  }
}
