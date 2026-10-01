import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'session_provider.dart';

class EmailVerificationPage extends ConsumerStatefulWidget {
  const EmailVerificationPage({super.key, required this.email});
  final String email;

  @override
  ConsumerState<EmailVerificationPage> createState() =>
      _EmailVerificationPageState();
}

class _EmailVerificationPageState extends ConsumerState<EmailVerificationPage> {
  final _code = TextEditingController();
  Timer? _timer;
  int _seconds = 60;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_seconds == 0) return;
      setState(() => _seconds--);
    });
    _code.addListener(() {
      if (_code.text.length == 6) _verify();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _code.dispose();
    super.dispose();
  }

  Future<void> _resend() async {
    if (_seconds > 0 || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(sessionProvider).requestEmailLoginCode(widget.email);
      setState(() => _seconds = 60);
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      _showError(tr(ref.read(localeProvider).value, 'requestFailed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_code.text.length != 6 || _busy) return;
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(sessionProvider)
          .verifyEmailAndStartSession(widget.email, _code.text);
      if (!mounted) return;
      if (result.destination == PostAuthDestination.home) {
        context.go('/home/discover');
      } else {
        context.go('/onboarding?step=${result.onboardingStep}');
      }
    } on ApiException catch (e) {
      _showError(e.message);
      _code.clear();
    } catch (_) {
      _showError(tr(ref.read(localeProvider).value, 'requestFailed'));
      _code.clear();
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
    final chars = _code.text.padRight(6).split('');
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        actions: [
          IconButton(
            tooltip: 'Help',
            icon: const Icon(HugeIcons.strokeRoundedHelpCircle),
            onPressed: () =>
                _showError('Enter the 6-digit code from your email.'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 26, 24, 24),
          children: [
            Center(
                child: Text('Verification code',
                    style: Theme.of(context)
                        .textTheme
                        .headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w800))),
            const SizedBox(height: 28),
            Center(
                child: Text('Please enter the 6-digit code sent to',
                    style: Theme.of(context).textTheme.bodyLarge)),
            const SizedBox(height: 4),
            Center(
                child: Text(widget.email,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 17))),
            const SizedBox(height: 42),
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
                                          width:
                                              i == _code.text.length ? 2 : 1))),
                              child: Text(chars[i].trim(),
                                  style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w600)),
                            ),
                          )),
                ),
                Opacity(
                    opacity: 0,
                    child: TextField(
                        controller: _code,
                        autofocus: true,
                        keyboardType: TextInputType.number,
                        maxLength: 6)),
              ],
            ),
            const SizedBox(height: 84),
            Center(
              child: _seconds > 0
                  ? Text('You can request a new code in $_seconds seconds',
                      style: Theme.of(context).textTheme.bodyLarge)
                  : TextButton(
                      onPressed: _resend, child: const Text('Resend code')),
            ),
          ],
        ),
      ),
    );
  }
}
