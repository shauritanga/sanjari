import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_text_field.dart';
import '../../widgets/selectable_card.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Gender picker with an optional pronouns field. Port of
/// apps/mobile/app/onboarding/gender.tsx: saves `{gender, pronouns?}`
/// (pronouns persist server-side; the store keeps no local copy) and
/// routes to who-to-meet.
class GenderPage extends ConsumerStatefulWidget {
  const GenderPage({super.key});

  @override
  ConsumerState<GenderPage> createState() => _GenderPageState();
}

class _GenderPageState extends ConsumerState<GenderPage> {
  final _pronouns = TextEditingController();
  String _selected = '';
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  @override
  void dispose() {
    _pronouns.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final trimmed = _pronouns.text.trim();
      final ok = await ref.read(onboardingControllerProvider).save(
        {
          'gender': _selected,
          if (trimmed.isNotEmpty) 'pronouns': trimmed,
        },
        stepNumber('gender'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('birthday'));
      } else {
        setState(() {
          _error =
              ref.read(onboardingControllerProvider).error ?? 'unableToSave';
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
      _selected = draft.gender;
    }
    return OnboardingScreen(
      step: stepNumber('gender'),
      title: "What's your gender?",
      subtitle: 'This helps us personalize your experience.',
      primaryLabel: 'Continue',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        children: [
          for (final option in genderOptions) ...[
            SelectableCard(
              title: option.label,
              selected: _selected == option.value,
              onTap: () => setState(() => _selected = option.value),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 4),
          AppTextField(
            label: 'Pronouns (optional)',
            controller: _pronouns,
            hint: 'e.g. she/her, he/him, they/them',
            maxLength: 40,
            error: _error,
          ),
        ],
      ),
    );
  }
}
