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

/// Phone auth: request code, then verify. Ports phone.tsx (login) and
/// extends it with real phone-only sign-up, backed by
/// POST /auth/phone/register(/verify) — a passwordless, emailless account
/// activated by OTP, mirroring email registration's
/// pending_verification -> active flow. [from] switches between the two:
/// 'signup' uses the birthday already captured during onboarding to create
/// the account; anything else (e.g. reached from
/// the login screen) stays login-only against an existing account.
class PhonePage extends ConsumerStatefulWidget {
  const PhonePage({super.key, this.from = 'login'});

  final String from;

  @override
  ConsumerState<PhonePage> createState() => _PhonePageState();
}

class _PhonePageState extends ConsumerState<PhonePage> {
  final _phone = TextEditingController();
  String? _error;
  bool _busy = false;

  bool get _isSignup => widget.from == 'signup';

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final strings = ref.read(localeProvider);
    final dateOfBirth = ref.read(pendingDateOfBirthProvider);
    if (_isSignup && dateOfBirth == null) {
      context.go('/onboarding/date-of-birth');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = ref.read(sessionProvider);
      if (_isSignup) {
        await session.registerPhone(
          _phone.text.trim(),
          dateOfBirth!,
          strings.value.languageCode,
        );
      } else {
        await session.requestPhoneLoginCode(_phone.text.trim());
      }
      if (!mounted) return;
      context.push(
        '/auth/verify-phone?phone=${Uri.encodeComponent(_phone.text.trim())}'
        '&from=${Uri.encodeComponent(widget.from)}',
      );
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
      appBar: AppBar(title: Text(tr(locale, 'phoneTitle'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          children: [
            Text(tr(locale, 'phoneCopy')),
            const SizedBox(height: SanjariSpacing.lg),
            AppTextField(
              label: tr(locale, 'phoneNumber'),
              controller: _phone,
              keyboardType: TextInputType.phone,
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
              label: tr(locale, 'sendCode'),
              busy: _busy,
              onPressed: _send,
            ),
            if (!_isSignup)
              TextButton(
                onPressed: () => context.go('/auth/phone?from=signup'),
                child: Text(tr(locale, 'needAccount')),
              ),
          ],
        ),
      ),
    );
  }
}
