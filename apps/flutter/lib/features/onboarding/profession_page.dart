import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_text_field.dart';
import '../../widgets/option_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Profession picker: a searchable list over [professionOptions], mirroring
/// the search-and-pick layout already used by [CountryPage]. Saves
/// `occupationCategory`.
class ProfessionPage extends ConsumerStatefulWidget {
  const ProfessionPage({super.key});

  @override
  ConsumerState<ProfessionPage> createState() => _ProfessionPageState();
}

class _ProfessionPageState extends ConsumerState<ProfessionPage> {
  final _query = TextEditingController();
  String _selected = '';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _query.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_selected.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'occupationCategory': _selected},
        stepNumber('profession'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('education'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? professionOptions
        : professionOptions
            .where((option) => option.label.toLowerCase().contains(normalized))
            .toList();
    return OnboardingScreen(
      step: stepNumber('profession'),
      title: "What's your profession?",
      primaryLabel: 'Continue',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Search jobs',
            controller: _query,
            hint: 'Type a profession',
          ),
          const SizedBox(height: 12),
          if (filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'No professions match your search.',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ),
            )
          else
            for (final option in filtered) ...[
              OptionRow(
                label: option.label,
                active: option.value == _selected,
                onTap: () => setState(() => _selected = option.value),
              ),
              const SizedBox(height: 8),
            ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: scheme.error)),
          ],
        ],
      ),
    );
  }
}
