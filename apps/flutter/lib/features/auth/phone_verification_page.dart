import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smart_auth/smart_auth.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../onboarding/pending_dob_provider.dart';
import 'session_provider.dart';

class PhoneVerificationPage extends ConsumerStatefulWidget {
  const PhoneVerificationPage({
    super.key,
    required this.phoneNumber,
    this.from = 'login',
  });

  final String phoneNumber;
  final String from;

  @override
  ConsumerState<PhoneVerificationPage> createState() =>
      _PhoneVerificationPageState();
}

class _PhoneVerificationPageState extends ConsumerState<PhoneVerificationPage> {
  final _code = TextEditingController();
  final _smartAuth = SmartAuth.instance;
  Timer? _resendTimer;
  int _resendSeconds = 30;
  bool _busy = false;

  bool get _isSignup => widget.from == 'signup';

  @override
  void initState() {
    super.initState();
    _startResendCooldown();
    _listenForSms();
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _smartAuth.removeSmsRetrieverApiListener();
    _code.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = 30);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      if (_resendSeconds <= 1) {
        timer.cancel();
        setState(() => _resendSeconds = 0);
      } else {
        setState(() => _resendSeconds--);
      }
    });
  }

  Future<void> _listenForSms() async {
    final result = await _smartAuth.getSmsWithRetrieverApi();
    if (!mounted || !result.hasData) return;
    final code = result.requireData.code;
    if (code == null || code.isEmpty) return;
    _code.text = code;
    await _verify();
  }

  Future<void> _resend() async {
    if (_resendSeconds > 0 || _busy) return;
    setState(() {
      _busy = true;
    });
    try {
      final session = ref.read(sessionProvider);
      if (_isSignup) {
        final dob = ref.read(pendingDateOfBirthProvider);
        if (dob == null) {
          if (mounted) context.go('/onboarding/date-of-birth');
          return;
        }
        await session.registerPhone(
          widget.phoneNumber,
          dob,
          ref.read(localeProvider).value.languageCode,
        );
      } else {
        await session.requestPhoneLoginCode(widget.phoneNumber);
      }
      _startResendCooldown();
      _listenForSms();
    } on ApiException catch (e) {
      if (mounted) _showError(e.message);
    } catch (_) {
      if (mounted) _showError(tr(ref.read(localeProvider).value, 'requestFailed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _verify() async {
    final locale = ref.read(localeProvider).value;
    if (_code.text.trim().isEmpty || _busy) {
      return;
    }
    setState(() {
      _busy = true;
    });
    try {
      final session = ref.read(sessionProvider);
      final result = _isSignup
          ? await session.verifyPhoneRegistration(
              widget.phoneNumber, _code.text.trim())
          : await session.verifyPhoneLoginCode(
              widget.phoneNumber, _code.text.trim());
      if (!mounted) return;
      context.go(result.destination == PostAuthDestination.home
          ? '/home'
          : '/onboarding?step=${result.onboardingStep}');
    } on ApiException catch (e) {
      if (mounted) _showError(e.message);
    } catch (_) {
      if (mounted) _showError(tr(locale, 'requestFailed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(tr(locale, 'verifyPhoneTitle'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          children: [
            Text(tr(locale, 'phoneCodeSentHint')),
            const SizedBox(height: SanjariSpacing.sm),
            Text(widget.phoneNumber,
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: SanjariSpacing.lg),
            AppTextField(
              label: tr(locale, 'verificationCode'),
              controller: _code,
              keyboardType: TextInputType.number,
              onSubmitted: (_) => _verify(),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            AppButton(
                label: tr(locale, 'verifyCode'),
                busy: _busy,
                onPressed: _verify),
            const SizedBox(height: SanjariSpacing.sm),
            TextButton(
              onPressed: _resendSeconds == 0 && !_busy ? _resend : null,
              child: Text(_resendSeconds == 0
                  ? tr(locale, 'resendCode')
                  : tr(locale, 'resendCodeIn')
                      .replaceAll('{seconds}', '$_resendSeconds')),
            ),
            TextButton(
              onPressed: _busy ? null : () => context.pop(),
              child: Text(tr(locale, 'changePhoneNumber')),
            ),
          ],
        ),
      ),
    );
  }
}
