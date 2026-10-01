import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Age confirmation. Port of apps/mobile/app/onboarding/birthday.tsx:
/// hydrates the draft on entry (like the store hydrate effect), shows the
/// server-verified age big, and routes to the gender step. No save — the
/// age comes from registration.
class BirthdayPage extends ConsumerStatefulWidget {
  const BirthdayPage({super.key});

  @override
  ConsumerState<BirthdayPage> createState() => _BirthdayPageState();
}

class _BirthdayPageState extends ConsumerState<BirthdayPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(onboardingControllerProvider).hydrate(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final draft = ref.watch(onboardingControllerProvider).draft;
    final age = draft.age?.toString() ?? '--';
    return OnboardingScreen(
      step: stepNumber('birthday'),
      title: 'Confirmed',
      subtitle:
          'Your age is verified and will never be shown publicly — only your age range appears on your profile.',
      primaryLabel: 'Continue',
      onPrimary: () => context.push(pathForStep('gender')),
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 32),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: scheme.surfaceContainerHighest,
        ),
        child: Column(
          children: [
            Icon(HugeIcons.strokeRoundedParty, color: scheme.primary, size: 36),
            Text(
              age,
              style: TextStyle(
                color: scheme.primary,
                fontSize: 64,
                height: 70 / 64,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              "You're $age years old",
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
