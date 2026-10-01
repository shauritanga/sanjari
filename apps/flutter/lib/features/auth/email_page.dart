import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/api_client.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import 'session_provider.dart';

class EmailPage extends ConsumerStatefulWidget {
  const EmailPage({super.key});

  @override
  ConsumerState<EmailPage> createState() => _EmailPageState();
}

class _EmailPageState extends ConsumerState<EmailPage> {
  final _email = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    final email = _email.text.trim().toLowerCase();
    if (email.isEmpty || !email.contains('@')) {
      _showError('Enter a valid email address.');
      return;
    }
    setState(() => _busy = true);
    try {
      final session = ref.read(sessionProvider);
      if (!await session.emailAccountExists(email)) {
        if (mounted) {
          context.push('/auth/signup?email=${Uri.encodeComponent(email)}');
        }
        return;
      }
      await session.requestEmailLoginCode(email);
      if (mounted) {
        context.push('/auth/email/verify?email=${Uri.encodeComponent(email)}');
      }
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      _showError(tr(ref.read(localeProvider).value, 'requestFailed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        actions: [
          IconButton(
            tooltip: 'Help',
            icon: const Icon(HugeIcons.strokeRoundedHelpCircle),
            onPressed: () =>
                _showError('We will email you a 6-digit verification code.'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 26, 24, 24),
          children: [
            Text("What’s your email address?",
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.6,
                    )),
            const SizedBox(height: 14),
            Text("We’ll email you a code to verify your identity.",
                style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 42),
            AppTextField(
              label: 'Email address',
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _continue(),
            ),
            const SizedBox(height: 86),
            AppButton(label: 'Continue', busy: _busy, onPressed: _continue),
            const SizedBox(height: 26),
            Text.rich(
              TextSpan(
                style: TextStyle(color: Colors.grey.shade700, height: 1.5),
                children: [
                  const TextSpan(text: 'By continuing you agree to our '),
                  TextSpan(
                    text: 'Terms',
                    style:
                        const TextStyle(decoration: TextDecoration.underline),
                    recognizer: TapGestureRecognizer()
                      ..onTap = () => context.push('/legal/terms'),
                  ),
                  const TextSpan(text: ' and '),
                  TextSpan(
                    text: 'Privacy Policy',
                    style:
                        const TextStyle(decoration: TextDecoration.underline),
                    recognizer: TapGestureRecognizer()
                      ..onTap = () => context.push('/legal/privacy-policy'),
                  ),
                ],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
