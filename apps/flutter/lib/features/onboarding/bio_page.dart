import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_text_field.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

const _starters = [
  'My ideal weekend...',
  "I'm passionate about...",
  'Ask me about...',
  'The way to win me over is...',
];

/// Bio editor with starter chips. Port of
/// apps/mobile/app/onboarding/bio.tsx: starters only fill an empty field,
/// Continue needs 10+ trimmed characters, failures surface as the footer
/// note.
class BioPage extends ConsumerStatefulWidget {
  const BioPage({super.key});

  @override
  ConsumerState<BioPage> createState() => _BioPageState();
}

class _BioPageState extends ConsumerState<BioPage> {
  final _bio = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    _bio.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _bio.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final trimmed = _bio.text.trim();
    if (trimmed.length < 10) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'biography': trimmed},
        stepNumber('bio'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('interests'));
      } else {
        setState(() => _error = controller.error ?? 'Unable to save your bio.');
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
      _bio.text = draft.biography;
    }
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('bio'),
      title: 'Write your bio',
      subtitle: 'Show your personality — you can always edit this later.',
      primaryLabel: 'Continue',
      primaryDisabled: _bio.text.trim().length < 10,
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: _error,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final starter in _starters)
                GestureDetector(
                  onTap: () {
                    if (_bio.text.trim().isNotEmpty) return;
                    _bio.text = '$starter ';
                  },
                  child: Container(
                    height: 40,
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: scheme.outline),
                      color: scheme.surface,
                    ),
                    child: Text(
                      starter,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          AppTextField(
            label: 'About you',
            controller: _bio,
            hint: 'Tell people what makes you, you...',
            maxLength: 500,
            minLines: 4,
          ),
        ],
      ),
    );
  }
}
