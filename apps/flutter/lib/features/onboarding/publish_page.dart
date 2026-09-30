import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Publish finale. Port of apps/mobile/app/onboarding/publish.tsx:
/// POST /onboarding/publish, then replace the stack with the discover tab.
/// Failures surface as the footer note and keep the user on this step.
class PublishPage extends ConsumerStatefulWidget {
  const PublishPage({super.key});

  @override
  ConsumerState<PublishPage> createState() => _PublishPageState();
}

class _PublishPageState extends ConsumerState<PublishPage> {
  bool _publishing = false;
  String? _error;

  Future<void> _publish() async {
    setState(() {
      _publishing = true;
      _error = null;
    });
    final controller = ref.read(onboardingControllerProvider);
    final ok = await controller.publishProfile();
    if (!mounted) return;
    if (ok) {
      context.go('/home/discover');
      return;
    }
    setState(() {
      _error = controller.error ??
          'Unable to publish your profile. Please try again.';
      _publishing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('publish'),
      title: "You're all set!",
      subtitle: 'Publish your profile and start discovering matches.',
      primaryLabel: 'Publish my profile',
      primaryBusy: _publishing,
      onPrimary: _publish,
      hideBack: true,
      footerNote: _error,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 48),
          Container(
            width: 140,
            height: 140,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scheme.surfaceContainerHighest,
            ),
            child: Icon(Icons.rocket_launch_outlined,
                color: scheme.primary, size: 56),
          ),
          const SizedBox(height: 24),
          Text(
            'Your profile is ready to shine. Once published, people nearby will start seeing you in their discovery feed.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              height: 24 / 16,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
