import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
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
        context.push(pathForStep('profession'));
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
      title: null,
      primaryLabel: 'Continue',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: 'This will never be shown on your profile.',
      footerNoteFontSize: 14,
      footerNoteWeight: FontWeight.w400,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 6),
          const _PinkMark(),
          const SizedBox(height: 18),
          const Text('What brings you to Sanjari?', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700,
                  letterSpacing: -0.3, height: 1.2)),
          const SizedBox(height: 34),
          _IntentionCard(value: 'marriage', label: "I'm ready to get\nmarried soon",
              icon: Icons.favorite, selected: _selected.contains('marriage'), onTap: _toggle),
          const SizedBox(height: 16),
          _IntentionCard(value: 'friends_first', label: 'I want to get to\nknow someone first',
              icon: Icons.chat_bubble_outline, selected: _selected.contains('friends_first'), onTap: _toggle),
          const SizedBox(height: 16),
          _IntentionCard(value: 'curious', label: "I'm just curious about Sanjari",
              icon: Icons.search, selected: _selected.contains('curious'), onTap: _toggle),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: scheme.error)),
          ],
        ],
      ),
    );
  }

  void _toggle(String value) => setState(() {
        _selected = _selected.contains(value) ? <String>[] : [value];
      });
}

class _PinkMark extends StatelessWidget {
  const _PinkMark();
  @override
  Widget build(BuildContext context) => const Icon(Icons.close,
      color: Color(0xFFFF1768), size: 54);
}

class _IntentionCard extends StatelessWidget {
  const _IntentionCard({required this.value, required this.label,
      required this.icon, required this.selected, required this.onTap});
  final String value;
  final String label;
  final IconData icon;
  final bool selected;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () => onTap(value),
        borderRadius: BorderRadius.circular(22),
        child: Container(
          height: 112,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          decoration: BoxDecoration(color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: selected ? Colors.black : Colors.grey.shade200,
                width: selected ? 2.5 : 1.5)),
          child: Row(children: [
            Expanded(child: Text(label, style: const TextStyle(fontSize: 18,
                fontWeight: FontWeight.w600, height: 1.35))),
            Icon(icon, size: 54, color: const Color(0xFFF7A7C8)),
          ]),
        ),
      );
}
