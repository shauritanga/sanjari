import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/selectable_card.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Email vs phone signup choice. Port of
/// apps/mobile/app/onboarding/registration-method.tsx: tapping a card
/// selects it and navigates immediately; Continue navigates to the current
/// selection.
class RegistrationMethodPage extends StatefulWidget {
  const RegistrationMethodPage({super.key});

  @override
  State<RegistrationMethodPage> createState() => _RegistrationMethodPageState();
}

class _RegistrationMethodPageState extends State<RegistrationMethodPage> {
  String _selected = 'email';

  void _goTo(String method) {
    context.push(
      method == 'email' ? '/auth/signup' : '/auth/phone?from=signup',
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('registration-method'),
      title: 'Create your account',
      subtitle: "Choose how you'd like to sign up.",
      primaryLabel: 'Continue',
      onPrimary: () => _goTo(_selected),
      child: Column(
        children: [
          SelectableCard(
            title: 'Continue with email',
            description: "We'll send you a verification link.",
            icon: Icon(HugeIcons.strokeRoundedMail01,
                color: scheme.primary, size: 22),
            selected: _selected == 'email',
            onTap: () {
              setState(() => _selected = 'email');
              _goTo('email');
            },
          ),
          const SizedBox(height: 12),
          SelectableCard(
            title: 'Continue with phone',
            description: "We'll text you a one-time code.",
            icon: Icon(HugeIcons.strokeRoundedSmartPhone01,
                color: scheme.primary, size: 22),
            selected: _selected == 'phone',
            onTap: () {
              setState(() => _selected = 'phone');
              _goTo('phone');
            },
          ),
        ],
      ),
    );
  }
}
