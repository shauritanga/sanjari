import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// 18+ gate. Port of apps/mobile/app/onboarding/age.tsx: no back button,
/// no server call — confirming routes to the (new) date-of-birth screen,
/// which does the actual DOB capture and validation.
class AgePage extends StatelessWidget {
  const AgePage({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('age'),
      hideBack: true,
      title: 'You must be 18+',
      subtitle:
          "Sanjari is an adults-only community. We verify your date of birth on the server, and it's never shown on your public profile — only your age.",
      primaryLabel: "I'm 18 or older",
      onPrimary: () => context.push('/onboarding/date-of-birth'),
      child: Text(
        "Next, we'll ask for your date of birth to confirm you can use Sanjari.",
        style: TextStyle(fontSize: 15, color: scheme.onSurfaceVariant),
      ),
    );
  }
}
