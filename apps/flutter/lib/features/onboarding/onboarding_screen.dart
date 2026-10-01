import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_button.dart';

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
                      icon: const Icon(HugeIcons.strokeRoundedArrowLeft01),
                      onPressed: onBack ?? () => context.pop(),
                    ),
                  const Spacer(),
                  IconButton(
                    tooltip: 'Help',
                    icon: const Icon(HugeIcons.strokeRoundedHelpCircle),
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Need help? We are here for you.')),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: (step / 23).clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: Colors.grey.shade300,
                  color: Colors.black,
                ),
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
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                        height: 1.15,
                        letterSpacing: -0.6,
                        fontSize: 30,
                      ),
                      textAlign: TextAlign.center,
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
