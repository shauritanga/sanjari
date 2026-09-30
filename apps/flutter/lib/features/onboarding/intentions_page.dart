import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/chip_group.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Relationship-intention picker, capped at 3. Port of
/// apps/mobile/app/onboarding/intentions.tsx.
class IntentionsPage extends ConsumerStatefulWidget {
  const IntentionsPage({super.key});

  @override
  ConsumerState<IntentionsPage> createState() => _IntentionsPageState();
}

class _IntentionsPageState extends ConsumerState<IntentionsPage> {
  List<String> _selected = [];
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'relationshipIntentions': _selected},
        stepNumber('intentions'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('name'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(onboardingControllerProvider).draft;
    if (!_seeded) {
      _seeded = true;
      _selected = List.of(draft.relationshipIntentions);
    }
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('intentions'),
      title: 'What are you looking for?',
      subtitle: 'Choose up to 3 — this can change anytime.',
      primaryLabel: 'Continue',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ChipGroup(
            options: [
              for (final option in intentionOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: _selected,
            max: 3,
            onChanged: (next) => setState(() => _selected = next),
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
