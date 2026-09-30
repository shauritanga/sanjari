import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/locale_controller.dart';

/// Onboarding flow host. Steps age..name have real screens (see
/// apps/mobile/app/onboarding/*); this stub still covers photos..publish
/// until their phase lands.
class OnboardingFlow extends ConsumerWidget {
  const OnboardingFlow({super.key, required this.step});

  final int step;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text('${tr(locale, 'welcome')} ($step)')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(tr(locale, 'comingSoon')),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => context.go('/home'),
              child: Text(tr(locale, 'discover')),
            ),
          ],
        ),
      ),
    );
  }
}
