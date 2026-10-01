import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/app_text_field.dart';
import '../settings/personal_info_page.dart' show personalInfoRepositoryProvider;
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Phone verification entry: requests an SMS code for an already
/// authenticated member via the existing POST /auth/phone/request, then
/// moves to the OTP step. Reuses PersonalInfoRepository rather than a new
/// repository, since it already wraps this exact call.
class PhoneVerifyPage extends ConsumerStatefulWidget {
  const PhoneVerifyPage({super.key});

  @override
  ConsumerState<PhoneVerifyPage> createState() => _PhoneVerifyPageState();
}

class _PhoneVerifyPageState extends ConsumerState<PhoneVerifyPage> {
  final _phone = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _phone.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final phoneNumber = _phone.text.trim();
    if (phoneNumber.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(personalInfoRepositoryProvider)
          .requestPhoneChange(phoneNumber);
      if (!mounted) return;
      context.push(
        '${pathForStep('phone-otp')}?phone=${Uri.encodeComponent(phoneNumber)}',
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to send a verification code right now.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('phone-verify'),
      title: 'Verify your phone number',
      subtitle:
          'Your number is only used to send a verification code and will never be shared on your profile.',
      primaryLabel: 'Continue',
      primaryDisabled: _phone.text.trim().isEmpty,
      primaryBusy: _busy,
      onPrimary: _send,
      secondaryLabel: 'Skip for now',
      onSecondary: () => context.push(pathForStep('photos')),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Phone number',
            controller: _phone,
            keyboardType: TextInputType.phone,
            hint: '+255700000000',
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: scheme.error)),
          ],
        ],
      ),
    );
  }
}
