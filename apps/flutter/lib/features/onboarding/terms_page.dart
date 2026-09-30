import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

const _bullets = [
  'Be yourself — real photos, real you.',
  'Treat every member with respect and kindness.',
  'We protect your data and never share your exact location.',
];

/// Terms summary with an agreement checkbox gating the primary action.
/// Port of apps/mobile/app/onboarding/terms.tsx.
class TermsPage extends StatefulWidget {
  const TermsPage({super.key});

  @override
  State<TermsPage> createState() => _TermsPageState();
}

class _TermsPageState extends State<TermsPage> {
  bool _agreed = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('terms'),
      title: 'Terms & Privacy',
      subtitle:
          'A quick summary before you join. The full details are always available in Settings.',
      primaryLabel: 'Agree and continue',
      primaryDisabled: !_agreed,
      onPrimary: () => context.push('/onboarding/registration-method'),
      child: Column(
        children: [
          for (final bullet in _bullets)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: scheme.outlineVariant),
                color: scheme.surface,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: scheme.surfaceContainerHighest,
                    ),
                    child: Icon(
                      Icons.verified_user_outlined,
                      color: scheme.primary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(bullet, style: const TextStyle(fontSize: 15)),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          GestureDetector(
            onTap: () => setState(() => _agreed = !_agreed),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  width: 1.5,
                  color: _agreed ? scheme.primary : scheme.outline,
                ),
                color: _agreed
                    ? scheme.primaryContainer
                    : scheme.surface,
              ),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        width: 1.5,
                        color: _agreed ? scheme.primary : scheme.outline,
                      ),
                      color: _agreed ? scheme.primary : Colors.transparent,
                    ),
                    child: _agreed
                        ? Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(2),
                              color: scheme.onPrimary,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'I agree to the Terms of Service and Privacy Policy',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
