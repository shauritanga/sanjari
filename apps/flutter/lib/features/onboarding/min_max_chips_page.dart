import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/chip_group.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Shared min/max chip-save page behind interests and languages. Mirrors
/// apps/mobile/app/onboarding/interests.tsx and languages.tsx: the footer
/// note doubles as the live counter, flipping to the error on failure.
class MinMaxChipsPage extends ConsumerStatefulWidget {
  const MinMaxChipsPage({
    super.key,
    required this.stepKey,
    required this.title,
    required this.subtitle,
    required this.field,
    required this.options,
    required this.min,
    required this.max,
    required this.nextKey,
    this.counterLabel,
  });

  final String stepKey;
  final String title;
  final String subtitle;
  final String field;
  final List<SelectOption> options;
  final int min;
  final int max;
  final String nextKey;

  /// Live counter suffix, e.g. 'min 5'. Null hides the counter (matches the
  /// languages screen, which only shows errors in the footer).
  final String? counterLabel;

  @override
  ConsumerState<MinMaxChipsPage> createState() => _MinMaxChipsPageState();
}

class _MinMaxChipsPageState extends ConsumerState<MinMaxChipsPage> {
  List<String> _selected = [];
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  Future<void> _save() async {
    if (_selected.length < widget.min) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {widget.field: _selected},
        stepNumber(widget.stepKey),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep(widget.nextKey));
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
      _selected = List.of(switch (widget.field) {
        'interests' => draft.interests,
        'personalityTraits' => draft.personalityTraits,
        _ => draft.languages,
      });
    }
    return OnboardingScreen(
      step: stepNumber(widget.stepKey),
      title: widget.title,
      subtitle: widget.subtitle,
      primaryLabel: 'Continue',
      primaryDisabled: _selected.length < widget.min,
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: _error ??
          (widget.counterLabel == null
              ? null
              : '${_selected.length} selected (${widget.counterLabel})'),
      child: ChipGroup(
        options: [
          for (final option in widget.options)
            ChipOption(value: option.value, label: option.label),
        ],
        selected: _selected,
        max: widget.max,
        onChanged: (next) => setState(() => _selected = next),
      ),
    );
  }
}

/// Interests step: at least 5, at most 20.
class InterestsPage extends StatelessWidget {
  const InterestsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const MinMaxChipsPage(
      stepKey: 'interests',
      title: 'What are you into?',
      subtitle: 'Pick at least 5 — great for icebreakers.',
      field: 'interests',
      options: interestOptions,
      min: 5,
      max: 15,
      nextKey: 'personality',
      counterLabel: 'min 5',
    );
  }
}

/// Languages step: at least 1, at most 10.
class LanguagesPage extends StatelessWidget {
  const LanguagesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const MinMaxChipsPage(
      stepKey: 'languages',
      title: 'What languages do you speak?',
      subtitle: 'Pick up to 10.',
      field: 'languages',
      options: languageOptions,
      min: 1,
      max: 10,
      nextKey: 'discovery-preferences',
    );
  }
}
