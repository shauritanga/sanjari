import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../widgets/app_text_field.dart';
import 'onboarding_controller.dart';
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
          Row(children: [
            Expanded(
                child: _GenderCard(
                    label: 'I am a man',
                    icon: HugeIcons.strokeRoundedUser,
                    selected: _selected == 'man',
                    onTap: () => setState(() => _selected = 'man'))),
            const SizedBox(width: 14),
            Expanded(
                child: _GenderCard(
                    label: 'I am a woman',
                    icon: HugeIcons.strokeRoundedUser,
                    selected: _selected == 'woman',
                    onTap: () => setState(() => _selected = 'woman'))),
          ]),
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

class _GenderCard extends StatelessWidget {
  const _GenderCard(
      {required this.label,
      required this.icon,
      required this.selected,
      required this.onTap});
  final String label;
  final dynamic icon;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 250,
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: selected ? Colors.black : Colors.grey.shade200,
                  width: selected ? 2 : 1)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 86, color: const Color(0xFFE58AB5)),
            const SizedBox(height: 24),
            Text(label,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))
          ]),
        ),
      );
}
