import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Best-effort profile preview. Port of
/// apps/mobile/app/onboarding/review.tsx: re-hydrates, resolves prompt
/// questions with swallowed lookup failures, and links back into the
/// photos (still stubbed) and bio steps.
class ReviewPage extends ConsumerStatefulWidget {
  const ReviewPage({super.key});

  @override
  ConsumerState<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends ConsumerState<ReviewPage> {
  bool _loading = true;
  Map<String, String> _promptTexts = const {};

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    try {
      await ref.read(onboardingControllerProvider).hydrate();
      final prompts =
          await ref.read(onboardingRepositoryProvider).fetchPrompts();
      if (!mounted) return;
      setState(() {
        _promptTexts = {for (final p in prompts) p.id: p.prompt};
      });
    } on ApiException {
      // Review is a best-effort preview — swallow lookup failures and fall
      // back to raw data, like the Expo screen.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _initials(String displayName) {
    final parts = displayName.trim().split(RegExp(r'\s+')).take(2).toList();
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.map((part) => part[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (_loading) {
      return OnboardingScreen(
        step: stepNumber('review'),
        title: 'Review your profile',
        subtitle: 'This is how others will see you.',
        primaryLabel: 'Looks good, continue',
        primaryDisabled: true,
        onPrimary: () {},
        child: const Padding(
          padding: EdgeInsets.symmetric(vertical: 32),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    final draft = ref.watch(onboardingControllerProvider).draft;
    final photoCount = draft.photos.length;
    return OnboardingScreen(
      step: stepNumber('review'),
      title: 'Review your profile',
      subtitle: 'This is how others will see you.',
      primaryLabel: 'Looks good, continue',
      onPrimary: () => context.push(pathForStep('publish')),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: scheme.outlineVariant),
          color: scheme.surface,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GestureDetector(
              onTap: () => context.push(pathForStep('photos')),
              child: Container(
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: scheme.surfaceContainerHighest,
                        border: Border.all(
                          width: 2,
                          color: draft.photos.isNotEmpty
                              ? scheme.primary
                              : scheme.outline,
                        ),
                      ),
                      child: Text(
                        _initials(draft.displayName),
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: scheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      photoCount > 0
                          ? '$photoCount photo${photoCount == 1 ? '' : 's'} added'
                          : 'No photos yet — tap to add',
                      style: TextStyle(
                        fontSize: 12,
                        color: photoCount > 0
                            ? scheme.onSurfaceVariant
                            : scheme.error,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              draft.displayName.isEmpty
                  ? 'Your name'
                  : '${draft.displayName}${draft.age == null ? '' : ', ${draft.age}'}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            if (draft.cityName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  draft.cityName,
                  style: TextStyle(
                    fontSize: 14,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => context.push(pathForStep('bio')),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionLabel('Bio', scheme),
                  Text(
                    draft.biography.isEmpty
                        ? 'No bio yet — tap to add one.'
                        : draft.biography,
                    style: const TextStyle(fontSize: 15, height: 21 / 15),
                  ),
                ],
              ),
            ),
            if (draft.interests.isNotEmpty) ...[
              const SizedBox(height: 12),
              _SectionLabel('Interests', scheme),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final interest in draft.interests)
                    Container(
                      height: 32,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        color: scheme.surfaceContainerHighest,
                      ),
                      child: Text(
                        interest,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ],
            if (draft.promptAnswers.isNotEmpty) ...[
              const SizedBox(height: 12),
              _SectionLabel('Prompts', scheme),
              const SizedBox(height: 8),
              for (final entry in draft.promptAnswers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _promptTexts[entry.promptId] ?? 'Prompt',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: scheme.primary,
                        ),
                      ),
                      Text(
                        entry.answer,
                        style: const TextStyle(fontSize: 15, height: 21 / 15),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text, this.scheme);

  final String text;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
