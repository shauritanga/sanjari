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

/// Email verification code entry. Port of verify-email.tsx.
/// Navigation target after success matches the login flow.
class VerifyEmailPage extends ConsumerStatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  ConsumerState<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends ConsumerState<VerifyEmailPage> {
  final _code = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final strings = ref.watch(localeProvider);
    final email = GoRouterState.of(context).uri.queryParameters['email'] ?? '';
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(sessionProvider)
          .verifyEmailAndStartSession(email, _code.text.trim());
      if (!mounted) return;
      if (result.destination == PostAuthDestination.home) {
        context.go('/home/discover');
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
      appBar: AppBar(title: Text(tr(locale, 'verifyEmailTitle'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          children: [
            Text(tr(locale, 'verifyEmailCopy')),
            const SizedBox(height: SanjariSpacing.lg),
            AppTextField(
              label: tr(locale, 'verificationCode'),
              controller: _code,
              keyboardType: TextInputType.number,
              error: _error,
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            AppButton(
              label: tr(locale, 'verifyCode'),
              busy: _busy,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}
