import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../auth/session_provider.dart';
import 'chaperone_models.dart';
import 'chaperone_repository.dart';

final chaperoneRepositoryProvider = Provider<ChaperoneRepository>((ref) {
  return ChaperoneRepository(ref.watch(sessionProvider).api);
});

/// Chaperone screen. Ports apps/mobile/app/settings/chaperone.tsx: loads
/// the existing chaperone (if any), edits name/relationship/email plus the
/// forward-copies toggle, saves with the same validation rule as Expo,
/// and removes with the form reset.
class ChaperonePage extends ConsumerStatefulWidget {
  const ChaperonePage({super.key});

  @override
  ConsumerState<ChaperonePage> createState() => _ChaperonePageState();
}

class _ChaperonePageState extends ConsumerState<ChaperonePage> {
  final _name = TextEditingController();
  final _relationship = TextEditingController();
  final _email = TextEditingController();
  bool _forwardEnabled = false;
  bool _hasChaperone = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    for (final controller in [_name, _relationship, _email]) {
      controller.addListener(() => setState(() {}));
    }
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _name.dispose();
    _relationship.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final strings = ref.read(localeProvider);
    try {
      final chaperone =
          await ref.read(chaperoneRepositoryProvider).fetchChaperone();
      if (!mounted) return;
      setState(() {
        if (chaperone != null) {
          _hasChaperone = true;
          _name.text = chaperone.name;
          _relationship.text = chaperone.relationship;
          _email.text = chaperone.email;
          _forwardEnabled = chaperone.forwardEnabled;
        }
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
        _error = tr(strings.value, 'unableToLoadChaperone');
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _saving = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(chaperoneRepositoryProvider).saveChaperone(
            Chaperone(
              name: _name.text.trim(),
              relationship: _relationship.text.trim(),
              email: _email.text.trim(),
              forwardEnabled: _forwardEnabled,
            ),
          );
      if (!mounted) return;
      setState(() {
        _hasChaperone = true;
        _notice = tr(strings.value, 'chaperoneSaved');
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = tr(strings.value, 'unableToSaveChaperone'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _remove() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _saving = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(chaperoneRepositoryProvider).removeChaperone();
      if (!mounted) return;
      setState(() {
        _hasChaperone = false;
        _name.clear();
        _relationship.clear();
        _email.clear();
        _forwardEnabled = false;
        _notice = tr(strings.value, 'chaperoneRemoved');
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(
        () => _error = tr(strings.value, 'unableToRemoveChaperone'),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final valid = chaperoneFormValid(
      _name.text,
      _relationship.text,
      _email.text,
    );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(HugeIcons.strokeRoundedArrowLeft01),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'chaperone')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(SanjariSpacing.lg),
              children: [
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(SanjariSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(HugeIcons.strokeRoundedUserGroup, size: 28),
                        const SizedBox(height: 8),
                        Text(
                          tr(locale, 'chaperoneIntroTitle'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(tr(locale, 'chaperoneIntroCopy')),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: SanjariSpacing.md),
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
                AppTextField(
                  label: tr(locale, 'chaperoneName'),
                  controller: _name,
                  hint: tr(locale, 'chaperoneNameHint'),
                ),
                const SizedBox(height: SanjariSpacing.md),
                AppTextField(
                  label: tr(locale, 'chaperoneRelationship'),
                  controller: _relationship,
                  hint: tr(locale, 'chaperoneRelationshipHint'),
                ),
                const SizedBox(height: SanjariSpacing.md),
                AppTextField(
                  label: tr(locale, 'chaperoneEmail'),
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(tr(locale, 'forwardCopies')),
                  subtitle: Text(tr(locale, 'forwardCopiesCopy')),
                  value: _forwardEnabled,
                  onChanged: (value) => setState(() => _forwardEnabled = value),
                ),
                const SizedBox(height: SanjariSpacing.md),
                AppButton(
                  label: tr(
                    locale,
                    _hasChaperone ? 'saveChanges' : 'addChaperone',
                  ),
                  busy: _saving,
                  onPressed: valid && !_saving ? _save : null,
                ),
                if (_hasChaperone) ...[
                  const SizedBox(height: SanjariSpacing.sm),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                    ),
                    onPressed: _saving ? null : _remove,
                    child: Text(tr(locale, 'removeChaperone')),
                  ),
                ],
              ],
            ),
    );
  }
}
