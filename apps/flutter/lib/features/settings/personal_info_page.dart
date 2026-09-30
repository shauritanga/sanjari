import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../auth/session_provider.dart';
import 'personal_info_models.dart';
import 'personal_info_repository.dart';

final personalInfoRepositoryProvider =
    Provider<PersonalInfoRepository>((ref) {
  return PersonalInfoRepository(ref.watch(sessionProvider).api);
});

enum _Flow { idle, enter, code }

/// Personal information screen. Ports
/// apps/mobile/app/settings/personal-info.tsx: read-only identity rows,
/// phone change with verification code, email change with verification
/// code, and the read-only date of birth with the support note.
class PersonalInfoPage extends ConsumerStatefulWidget {
  const PersonalInfoPage({super.key});

  @override
  ConsumerState<PersonalInfoPage> createState() => _PersonalInfoPageState();
}

class _PersonalInfoPageState extends ConsumerState<PersonalInfoPage> {
  final _phoneInput = TextEditingController();
  final _phoneCode = TextEditingController();
  final _emailInput = TextEditingController();
  final _emailCode = TextEditingController();

  PersonalInfo? _info;
  bool _loading = true;
  bool _busy = false;
  _Flow _phoneFlow = _Flow.idle;
  _Flow _emailFlow = _Flow.idle;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    for (final controller in
        [_phoneInput, _phoneCode, _emailInput, _emailCode]) {
      controller.addListener(() => setState(() {}));
    }
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _phoneInput.dispose();
    _phoneCode.dispose();
    _emailInput.dispose();
    _emailCode.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final strings = ref.read(localeProvider);
    try {
      final info =
          await ref.read(personalInfoRepositoryProvider).fetchInfo();
      if (!mounted) return;
      setState(() {
        _info = info;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = tr(strings.value, 'unableToLoadDetails');
        _loading = false;
      });
    }
  }

  Future<void> _requestPhoneChange() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(personalInfoRepositoryProvider)
          .requestPhoneChange(_phoneInput.text.trim());
      if (!mounted) return;
      setState(() => _phoneFlow = _Flow.code);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = tr(strings.value, 'unableToSendCode'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmPhoneChange() async {
    final strings = ref.read(localeProvider);
    final phone = _phoneInput.text.trim();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(personalInfoRepositoryProvider)
          .confirmPhoneChange(phone, _phoneCode.text.trim());
      if (!mounted) return;
      setState(() {
        _info = _info?.copyWith(phoneNumber: phone);
        _notice = tr(strings.value, 'phoneUpdated');
        _phoneFlow = _Flow.idle;
        _phoneInput.clear();
        _phoneCode.clear();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = tr(strings.value, 'codeInvalid'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestEmailChange() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(personalInfoRepositoryProvider)
          .requestEmailChange(_emailInput.text.trim());
      if (!mounted) return;
      setState(() => _emailFlow = _Flow.code);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = tr(strings.value, 'unableToSendCode'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmEmailChange() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final email = await ref
          .read(personalInfoRepositoryProvider)
          .confirmEmailChange(
            _emailInput.text.trim(),
            _emailCode.text.trim(),
          );
      if (!mounted) return;
      setState(() {
        _info = _info?.copyWith(email: email);
        _notice = tr(strings.value, 'emailUpdated');
        _emailFlow = _Flow.idle;
        _emailInput.clear();
        _emailCode.clear();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = tr(strings.value, 'codeInvalid'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final info = _info;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'personalInfo')),
      ),
      body: _loading || info == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(SanjariSpacing.lg),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(
                      bottom: SanjariSpacing.sm,
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                if (_notice != null)
                  Padding(
                    padding: const EdgeInsets.only(
                      bottom: SanjariSpacing.sm,
                    ),
                    child: Text(
                      _notice!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                _NavRow(
                  icon: Icons.person_outline,
                  label: tr(locale, 'nameGender'),
                  value: info.displayName?.isNotEmpty == true
                      ? [
                          info.displayName!,
                          if (info.gender?.isNotEmpty == true)
                            info.gender,
                        ].join(' · ')
                      : tr(locale, 'addYourDetails'),
                  onTap: () => context.push('/profile/edit'),
                ),
                const SizedBox(height: SanjariSpacing.md),
                _Card(
                  children: [
                    _HeaderRow(
                      icon: Icons.phone_outlined,
                      label: tr(locale, 'phoneNumber'),
                      value: info.phoneNumber ??
                          tr(locale, 'notSet'),
                    ),
                    if (_phoneFlow == _Flow.idle)
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize:
                              const Size.fromHeight(48),
                        ),
                        onPressed: () {
                          _phoneInput.clear();
                          setState(() {
                            _phoneFlow = _Flow.enter;
                            _error = null;
                            _notice = null;
                          });
                        },
                        child: Text(
                          tr(
                            locale,
                            info.phoneNumber != null
                                ? 'changePhone'
                                : 'addPhone',
                          ),
                        ),
                      ),
                    if (_phoneFlow == _Flow.enter) ...[
                      AppTextField(
                        label: tr(locale, 'newPhone'),
                        controller: _phoneInput,
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      AppButton(
                        label: tr(locale, 'sendCode'),
                        busy: _busy,
                        onPressed:
                            phoneEntryValid(_phoneInput.text) &&
                                    !_busy
                                ? _requestPhoneChange
                                : null,
                      ),
                    ],
                    if (_phoneFlow == _Flow.code) ...[
                      AppTextField(
                        label: tr(locale, 'verificationCode'),
                        controller: _phoneCode,
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      AppButton(
                        label: tr(locale, 'confirmAction'),
                        busy: _busy,
                        onPressed:
                            codeValid(_phoneCode.text) && !_busy
                                ? _confirmPhoneChange
                                : null,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: SanjariSpacing.md),
                _Card(
                  children: [
                    _HeaderRow(
                      icon: Icons.mail_outline,
                      label: tr(locale, 'emailAddress'),
                      value: info.email,
                    ),
                    if (_emailFlow == _Flow.idle)
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize:
                              const Size.fromHeight(48),
                        ),
                        onPressed: () {
                          _emailInput.clear();
                          setState(() {
                            _emailFlow = _Flow.enter;
                            _error = null;
                            _notice = null;
                          });
                        },
                        child:
                            Text(tr(locale, 'changeEmail')),
                      ),
                    if (_emailFlow == _Flow.enter) ...[
                      AppTextField(
                        label: tr(locale, 'newEmail'),
                        controller: _emailInput,
                        keyboardType:
                            TextInputType.emailAddress,
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      AppButton(
                        label: tr(locale, 'sendCode'),
                        busy: _busy,
                        onPressed:
                            emailEntryValid(_emailInput.text) &&
                                    !_busy
                                ? _requestEmailChange
                                : null,
                      ),
                    ],
                    if (_emailFlow == _Flow.code) ...[
                      AppTextField(
                        label: tr(locale, 'verificationCode'),
                        controller: _emailCode,
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      AppButton(
                        label: tr(locale, 'confirmAction'),
                        busy: _busy,
                        onPressed:
                            codeValid(_emailCode.text) && !_busy
                                ? _confirmEmailChange
                                : null,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: SanjariSpacing.md),
                _Card(
                  children: [
                    _HeaderRow(
                      icon: Icons.cake_outlined,
                      label: tr(locale, 'dateOfBirthLabel'),
                      value: formatBirthDate(info.dateOfBirth),
                    ),
                    Text(
                      tr(locale, 'dobNote'),
                      style: TextStyle(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: SanjariSpacing.sm),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: Theme.of(context)
                .colorScheme
                .surfaceContainerHighest,
            child: Icon(icon, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: Theme.of(context)
              .colorScheme
              .surfaceContainerHighest,
          child: Icon(icon, size: 18),
        ),
        title: Text(
          label,
          style: TextStyle(
            color:
                Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 12,
          ),
        ),
        subtitle: Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
