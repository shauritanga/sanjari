import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../settings/passcode_page.dart';
import 'app_lock.dart';

/// Privacy lock. Port of apps/mobile/app/lock.tsx: when biometrics are
/// preferred, one system prompt attempt runs on entry (spinner until it
/// settles); otherwise — or when it fails — the PIN form shows. Unlocking
/// marks the app-lock gate satisfied and replaces the stack with [next].
class LockPage extends ConsumerStatefulWidget {
  const LockPage({super.key, this.next = '/home/discover'});

  final String next;

  @override
  ConsumerState<LockPage> createState() => _LockPageState();
}

class _LockPageState extends ConsumerState<LockPage> {
  final _pin = TextEditingController();
  bool _checkingBiometric = true;
  bool _verifying = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _pin.addListener(() => setState(() {}));
    Future.microtask(_attemptBiometric);
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  void _unlock() {
    ref.read(appLockGateProvider.notifier).state = true;
    context.go(widget.next);
  }

  Future<void> _attemptBiometric() async {
    final store = ref.read(passcodeStoreProvider);
    if (await store.isBiometricPreferred()) {
      if (await store.tryBiometricUnlock()) {
        if (!mounted) return;
        _unlock();
        return;
      }
    }
    if (mounted) setState(() => _checkingBiometric = false);
  }

  Future<void> _submitPin() async {
    setState(() {
      _verifying = true;
      _error = '';
    });
    final valid =
        await ref.read(passcodeStoreProvider).verifyPasscode(_pin.text);
    if (!mounted) return;
    setState(() => _verifying = false);
    if (valid) {
      _unlock();
      return;
    }
    setState(() {
      _error = 'Incorrect passcode.';
      _pin.clear();
    });
  }

  Future<void> _retryBiometric() async {
    if (await ref.read(passcodeStoreProvider).tryBiometricUnlock()) {
      if (!mounted) return;
      _unlock();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (_checkingBiometric) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(SanjariSpacing.lg),
            children: [
              Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: scheme.surfaceContainerHighest,
                ),
                child: Icon(
                  Icons.lock_outline,
                  color: scheme.primary,
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Enter your passcode',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Sanjari is locked for your privacy.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Passcode',
                controller: _pin,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 6,
                error: _error.isEmpty ? null : _error,
                onSubmitted: (_) {
                  if (_pin.text.length >= 4 && !_verifying) _submitPin();
                },
              ),
              const SizedBox(height: 12),
              AppButton(
                label: 'Unlock',
                onPressed:
                    _pin.text.length < 4 || _verifying ? null : _submitPin,
                busy: _verifying,
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton.icon(
                  onPressed: _retryBiometric,
                  icon: Icon(
                    Icons.fingerprint,
                    color: scheme.primary,
                    size: 20,
                  ),
                  label: Text(
                    'Use biometric unlock',
                    style: TextStyle(
                      color: scheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
