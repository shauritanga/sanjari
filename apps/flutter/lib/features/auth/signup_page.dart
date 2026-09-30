import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/under18_dialog.dart';
import '../onboarding/pending_dob_provider.dart';
import 'session_provider.dart';

/// Email registration. RegisterDto requires email, password and
/// dateOfBirth, which is supplied by the earlier onboarding step.
/// Port of apps/mobile/app/(auth)/signup.tsx.
class SignupPage extends ConsumerStatefulWidget {
  const SignupPage({super.key});

  @override
  ConsumerState<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends ConsumerState<SignupPage> {
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
    final strings = ref.read(localeProvider);
    final dateOfBirth = ref.read(pendingDateOfBirthProvider);
    if (dateOfBirth == null) {
      context.go('/onboarding/date-of-birth');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider).api.post('/auth/register', {
        'email': _email.text.trim(),
        'password': _password.text,
        'dateOfBirth':
            '${dateOfBirth.year.toString().padLeft(4, '0')}-${dateOfBirth.month.toString().padLeft(2, '0')}-${dateOfBirth.day.toString().padLeft(2, '0')}',
        'confirmedAdult': true,
        'acceptedTermsVersion': '2026-01',
        'acceptedPrivacyVersion': '2026-01',
        'locale': strings.value.languageCode,
      });
      if (!mounted) return;
      context.push(
          '/auth/verify-email?email=${Uri.encodeComponent(_email.text.trim())}');
    } on ApiException catch (e) {
      if (e.message.contains('18 years old')) {
        if (mounted) {
          await showUnder18Dialog(context, ref.read(localeProvider).value);
        }
      } else {
        setState(() => _error = e.message);
      }
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
              tr(locale, 'signupTitle'),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: SanjariSpacing.xs),
            Text(tr(locale, 'signupCopy')),
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
              textInputAction: TextInputAction.done,
            ),
            if (_error != null) ...[
              const SizedBox(height: SanjariSpacing.sm),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: SanjariSpacing.lg),
            AppButton(
              label: tr(locale, _busy ? 'creatingAccount' : 'signup'),
              busy: _busy,
              onPressed: _submit,
            ),
            TextButton(
              onPressed: () => context.go('/auth/login'),
              child: Text(tr(locale, 'haveAccount')),
            ),
          ],
        ),
      ),
    );
  }
}
