import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../settings/personal_info_page.dart' show personalInfoRepositoryProvider;
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// 6-digit phone verification code entry, completing the phone-verify step
/// started by [PhoneVerifyPage] via the existing POST /auth/phone/verify.
class PhoneOtpPage extends ConsumerStatefulWidget {
  const PhoneOtpPage({super.key, required this.phoneNumber});

  final String phoneNumber;

  @override
  ConsumerState<PhoneOtpPage> createState() => _PhoneOtpPageState();
}

class _PhoneOtpPageState extends ConsumerState<PhoneOtpPage> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _code.addListener(() {
      if (_code.text.length == 6) _verify();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_code.text.length != 6 || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(personalInfoRepositoryProvider)
          .confirmPhoneChange(widget.phoneNumber, _code.text);
      final ok = await ref.read(onboardingControllerProvider).save(
        const {},
        stepNumber('phone-otp'),
      );
      if (!mounted || !ok) return;
      context.push(pathForStep('photos'));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
      _code.clear();
    } catch (_) {
      setState(() => _error = 'That code is invalid or expired.');
      _code.clear();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chars = _code.text.padRight(6).split('');
    return OnboardingScreen(
      step: stepNumber('phone-otp'),
      title: 'Enter verification code',
      subtitle: 'Please enter the 6-digit code sent to ${widget.phoneNumber}',
      primaryLabel: 'Continue',
      primaryDisabled: _code.text.length != 6,
      primaryBusy: _busy,
      onPrimary: _verify,
      child: Column(
        children: [
          Stack(
            children: [
              Row(
                children: List.generate(
                  6,
                  (i) => Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: i == 5 ? 0 : 12),
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: i == _code.text.length
                                ? SanjariColors.coral
                                : Colors.grey.shade300,
                            width: i == _code.text.length ? 2 : 1,
                          ),
                        ),
                      ),
                      child: Text(
                        chars[i].trim(),
                        style: const TextStyle(
                            fontSize: 24, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
              ),
              Opacity(
                opacity: 0,
                child: TextField(
                  controller: _code,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
        ],
      ),
    );
  }
}
