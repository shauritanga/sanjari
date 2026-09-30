import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/passcode.dart';
import '../../core/passcode_devices.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';

final passcodeStoreProvider = Provider<PasscodeStore>((ref) {
  return PasscodeStore(
    storage: SecurePasscodeStorage(),
    biometrics: LocalAuthBiometrics(),
  );
});

enum _Step { idle, create, confirm, disable }

/// Passcode lock settings. Ports apps/mobile/app/settings/passcode.tsx:
/// status card, create/confirm PIN flow (4+ digits, matching confirmation),
/// disable-behind-verification flow, and the biometric toggle shown only
/// when a passcode is enabled, hardware is available, and no flow is open.
class PasscodePage extends ConsumerStatefulWidget {
  const PasscodePage({super.key});

  @override
  ConsumerState<PasscodePage> createState() => _PasscodePageState();
}

class _PasscodePageState extends ConsumerState<PasscodePage> {
  final _pinInput = TextEditingController();
  bool _enabled = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  _Step _step = _Step.idle;
  String _firstPin = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _pinInput.addListener(() => setState(() {}));
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _pinInput.dispose();
    super.dispose();
  }

  PasscodeStore get _store => ref.read(passcodeStoreProvider);

  Future<void> _load() async {
    final results = await Future.wait([
      _store.isPasscodeEnabled(),
      _store.biometrics.isAvailable(),
      _store.isBiometricPreferred(),
    ]);
    if (!mounted) return;
    setState(() {
      _enabled = results[0];
      _biometricAvailable = results[1];
      _biometricEnabled = results[2];
    });
  }

  void _startCreate() {
    setState(() {
      _step = _Step.create;
      _firstPin = '';
      _pinInput.clear();
      _error = null;
    });
  }

  Future<void> _submitCreateStep() async {
    final locale = ref.read(localeProvider).value;
    final pin = _pinInput.text;
    if (!pinLongEnough(pin)) {
      setState(() => _error = tr(locale, 'pinTooShort'));
      return;
    }
    if (_step == _Step.create) {
      setState(() {
        _firstPin = pin;
        _pinInput.clear();
        _step = _Step.confirm;
        _error = null;
      });
      return;
    }
    if (!pinsMatch(pin, _firstPin)) {
      setState(() {
        _error = tr(locale, 'pinsMismatch');
        _pinInput.clear();
        _step = _Step.create;
        _firstPin = '';
      });
      return;
    }
    await _store.setPasscode(pin);
    if (!mounted) return;
    setState(() {
      _enabled = true;
      _step = _Step.idle;
      _pinInput.clear();
      _firstPin = '';
      _error = null;
    });
  }

  void _startDisable() {
    setState(() {
      _step = _Step.disable;
      _pinInput.clear();
      _error = null;
    });
  }

  Future<void> _submitDisable() async {
    final locale = ref.read(localeProvider).value;
    final valid = await _store.verifyPasscode(_pinInput.text);
    if (!mounted) return;
    if (!valid) {
      setState(() => _error = tr(locale, 'incorrectPasscode'));
      return;
    }
    await _store.clearPasscode();
    if (!mounted) return;
    setState(() {
      _enabled = false;
      _biometricEnabled = false;
      _step = _Step.idle;
      _pinInput.clear();
      _error = null;
    });
  }

  Future<void> _toggleBiometric(bool value) async {
    await _store.setBiometricPreferred(value);
    if (!mounted) return;
    setState(() => _biometricEnabled = value);
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final flowOpen = _step != _Step.idle;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'passcodeLock')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(SanjariSpacing.lg),
        children: [
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(SanjariSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lock_outline, size: 28),
                  const SizedBox(height: 8),
                  Text(
                    tr(
                      locale,
                      _enabled ? 'passcodeOn' : 'passcodeOff',
                    ),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(tr(locale, 'passcodeIntro')),
                  if (!flowOpen) ...[
                    const SizedBox(height: SanjariSpacing.md),
                    if (_enabled)
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize:
                              const Size.fromHeight(52),
                        ),
                        onPressed: _startDisable,
                        child: Text(
                          tr(locale, 'turnOffPasscode'),
                        ),
                      )
                    else
                      AppButton(
                        label: tr(locale, 'setPasscode'),
                        onPressed: _startCreate,
                      ),
                  ],
                ],
              ),
            ),
          ),
          if (_step == _Step.create || _step == _Step.confirm) ...[
            const SizedBox(height: SanjariSpacing.md),
            AppTextField(
              label: tr(
                locale,
                _step == _Step.create
                    ? 'createPasscode'
                    : 'confirmPasscode',
              ),
              controller: _pinInput,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              error: _error,
            ),
            const SizedBox(height: SanjariSpacing.sm),
            AppButton(
              label: tr(locale, 'continueAction'),
              onPressed: pinLongEnough(_pinInput.text)
                  ? _submitCreateStep
                  : null,
            ),
          ],
          if (_step == _Step.disable) ...[
            const SizedBox(height: SanjariSpacing.md),
            AppTextField(
              label: tr(locale, 'enterCurrentPasscode'),
              controller: _pinInput,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              error: _error,
            ),
            const SizedBox(height: SanjariSpacing.sm),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
              onPressed: pinLongEnough(_pinInput.text)
                  ? _submitDisable
                  : null,
              child: Text(tr(locale, 'turnOffPasscode')),
            ),
          ],
          if (_enabled && _biometricAvailable && !flowOpen) ...[
            const SizedBox(height: SanjariSpacing.md),
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(SanjariSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.fingerprint,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          tr(locale, 'biometricUnlock'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        tr(locale, 'useBiometrics'),
                      ),
                      subtitle: Text(
                        tr(locale, 'biometricsFallback'),
                      ),
                      value: _biometricEnabled,
                      onChanged: _toggleBiometric,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
