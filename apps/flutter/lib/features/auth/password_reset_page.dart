import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import 'session_provider.dart';

/// Password-reset request. Port of password-reset.tsx
/// (POST /auth/password-reset/request).
class PasswordResetPage extends ConsumerStatefulWidget {
  const PasswordResetPage({super.key});

  @override
  ConsumerState<PasswordResetPage> createState() => _PasswordResetPageState();
}

class _PasswordResetPageState extends ConsumerState<PasswordResetPage> {
  final _email = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final strings = ref.watch(localeProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider).requestPasswordReset(_email.text.trim());
      setState(() => _sent = true);
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
      appBar: AppBar(title: Text(tr(locale, 'passwordResetTitle'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          children: [
            Text(tr(locale, 'passwordResetCopy')),
            const SizedBox(height: SanjariSpacing.lg),
            AppTextField(
              label: tr(locale, 'email'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              error: _error,
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            if (_sent)
              FilledButton.tonal(
                onPressed: () => context.go('/auth/login'),
                child: Text(tr(locale, 'login')),
              )
            else
              AppButton(
                label: tr(locale, 'sendResetLink'),
                busy: _busy,
                onPressed: _submit,
              ),
          ],
        ),
      ),
    );
  }
}
