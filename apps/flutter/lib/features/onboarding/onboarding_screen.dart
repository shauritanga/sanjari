import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_button.dart';
import 'onboarding_steps.dart';

/// Shared onboarding scaffold. Port of OnboardingScreen.tsx: back affordance
/// (hidden on the age gate), step progress bar, title/subtitle header,
/// scrollable body, and a footer with the primary action, an optional
/// ghost secondary action, and an optional footnote.
class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({
    super.key,
    required this.step,
    this.title,
    this.subtitle,
    this.hideBack = false,
    this.onBack,
    this.onSkip,
    required this.primaryLabel,
    required this.onPrimary,
    this.primaryDisabled = false,
    this.primaryBusy = false,
    this.secondaryLabel,
    this.onSecondary,
    this.footerNote,
    required this.child,
  });

  final int step;
  final String? title;
  final String? subtitle;
  final bool hideBack;
  final VoidCallback? onBack;
  final VoidCallback? onSkip;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final bool primaryDisabled;
  final bool primaryBusy;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final String? footerNote;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
              child: Row(
                children: [
                  if (hideBack)
                    const SizedBox(width: 48)
                  else
                    IconButton(
                      tooltip: 'Go back',
                      icon: const Icon(Icons.arrow_back),
                      onPressed: onBack ?? () => context.pop(),
                    ),
                  Expanded(
                    child: _ProgressBar(
                      current: step,
                      total: totalOnboardingSteps,
                    ),
                  ),
                  if (onSkip != null)
                    TextButton(onPressed: onSkip, child: const Text('Skip'))
                  else
                    const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                children: [
                  if (title != null)
                    Text(
                      title!,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: scheme.primary,
                      ),
                    ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 15,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  child,
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: scheme.outlineVariant),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (footerNote != null) ...[
                    Text(
                      footerNote!,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  AppButton(
                    label: primaryLabel,
                    onPressed: primaryDisabled ? null : onPrimary,
                    busy: primaryBusy,
                  ),
                  if (secondaryLabel != null) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: onSecondary,
                      child: Text(secondaryLabel!),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.current, required this.total});

  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ratio = total > 0
        ? (current / total).clamp(0.0, 1.0)
        : 0.0;
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: SizedBox(
        height: 6,
        child: LinearProgressIndicator(
          value: ratio,
          backgroundColor: scheme.outlineVariant,
          color: scheme.primary,
        ),
      ),
    );
  }
}
