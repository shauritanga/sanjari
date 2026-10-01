import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/chip_selection.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_repository.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Prompt picker + answers. Port of
/// apps/mobile/app/onboarding/prompts.tsx: exactly 3 prompts each with a
/// non-blank answer (max 300 chars) gates Continue; the footer note doubles
/// as the live counter, flipping to the error on failure.
class PromptsPage extends ConsumerStatefulWidget {
  const PromptsPage({super.key});

  @override
  ConsumerState<PromptsPage> createState() => _PromptsPageState();
}

class _PromptsPageState extends ConsumerState<PromptsPage> {
  List<PromptOption> _prompts = [];
  bool _loading = true;
  String? _error;
  List<String> _selectedIds = [];
  final Map<String, TextEditingController> _answers = {};
  bool _saving = false;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    for (final controller in _answers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  TextEditingController _answerFor(String promptId, String seed) {
    return _answers.putIfAbsent(promptId, () {
      final controller = TextEditingController(text: seed);
      controller.addListener(() => setState(() {}));
      return controller;
    });
  }

  Future<void> _load() async {
    try {
      final prompts =
          await ref.read(onboardingRepositoryProvider).fetchPrompts();
      if (!mounted) return;
      setState(() {
        _prompts = prompts;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  int get _readyCount => _selectedIds
      .where((id) => (_answers[id]?.text.trim().isNotEmpty ?? false))
      .length;

  bool get _isComplete => _selectedIds.length == 3 && _readyCount == 3;

  Future<void> _save() async {
    if (!_isComplete) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.savePrompts([
        for (final promptId in _selectedIds)
          PromptAnswerDraft(
            promptId: promptId,
            answer: (_answers[promptId]?.text ?? '').trim(),
          ),
      ]);
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('languages'));
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
      _selectedIds = [for (final a in draft.promptAnswers) a.promptId];
      for (final a in draft.promptAnswers) {
        _answerFor(a.promptId, a.answer);
      }
    }
    final scheme = Theme.of(context).colorScheme;
    final selectedPrompts =
        _prompts.where((prompt) => _selectedIds.contains(prompt.id)).toList();
    return OnboardingScreen(
      step: stepNumber('prompts'),
      title: 'Answer a few prompts',
      subtitle:
          'Pick 3 prompts and share your answer — this is prime real estate on your profile.',
      primaryLabel: 'Continue',
      primaryDisabled: !_isComplete,
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: _error ?? '${_selectedIds.length}/3 prompts selected',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            for (final prompt in _prompts) ...[
              _PromptRow(
                label: prompt.prompt,
                active: _selectedIds.contains(prompt.id),
                disabled: !_selectedIds.contains(prompt.id) &&
                    _selectedIds.length >= 3,
                onTap: () => setState(() {
                  _selectedIds = toggleChipSelection(
                    _selectedIds,
                    prompt.id,
                    max: 3,
                  );
                }),
              ),
              const SizedBox(height: 8),
            ],
          if (selectedPrompts.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final prompt in selectedPrompts)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: AppTextField(
                  label: prompt.prompt,
                  controller: _answerFor(prompt.id, ''),
                  hint: 'Your answer...',
                  maxLength: 300,
                  minLines: 2,
                ),
              ),
          ],
          if (_error != null && _prompts.isEmpty)
            Text(_error!, style: TextStyle(color: scheme.error)),
        ],
      ),
    );
  }
}

class _PromptRow extends StatelessWidget {
  const _PromptRow({
    required this.label,
    required this.active,
    required this.disabled,
    required this.onTap,
  });

  final String label;
  final bool active;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: GestureDetector(
        onTap: disabled ? null : onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              width: 1.5,
              color: active ? scheme.primary : scheme.outline,
            ),
            color: active ? scheme.primaryContainer : scheme.surface,
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
