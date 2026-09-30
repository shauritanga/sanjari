import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/chip_group.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Multi-select gender preference. Port of
/// apps/mobile/app/onboarding/who-to-meet.tsx: saves `interestedIn` and,
/// in parallel like the store's Promise.all, narrows the Discover gender
/// filter ('everyone' — or nothing specific — means no filter).
class WhoToMeetPage extends ConsumerStatefulWidget {
  const WhoToMeetPage({super.key});

  @override
  ConsumerState<WhoToMeetPage> createState() => _WhoToMeetPageState();
}

class _WhoToMeetPageState extends ConsumerState<WhoToMeetPage> {
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
      final genders =
          _selected.contains('everyone') ? const <String>[] : _selected;
      final results = await Future.wait([
        controller.save(
          {'interestedIn': _selected},
          stepNumber('who-to-meet'),
        ),
        controller.saveDiscoveryPreference({'genders': genders}),
      ]);
      if (!mounted) return;
      if (results.every((ok) => ok)) {
        context.push(pathForStep('intentions'));
      } else {
        setState(() {
          _error = controller.error ?? 'unableToSave';
        });
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
      _selected = List.of(draft.interestedIn);
    }
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('who-to-meet'),
      title: 'Who do you want to meet?',
      subtitle: 'Select all that apply.',
      primaryLabel: 'Continue',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ChipGroup(
            options: [
              for (final option in whoToMeetOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: _selected,
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
