import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../widgets/app_button.dart';

/// First-run entry point, matching apps/mobile/app/onboarding/welcome.tsx.
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(SanjariSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Container(
                width: 88,
                height: 88,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(SanjariRadius.xl),
                ),
                child: Icon(Icons.favorite_outline,
                    size: 40, color: scheme.primary),
              ),
              const SizedBox(height: SanjariSpacing.lg),
              Text('Sanjari', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: SanjariSpacing.sm),
              Text(
                'Real people, real connections. Meet someone worth the swipe — thoughtfully matched, safely verified.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
              const Spacer(),
              AppButton(
                label: 'Get started',
                onPressed: () => context.push('/onboarding/age'),
              ),
              const SizedBox(height: SanjariSpacing.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.push('/auth/login'),
                  child: const Text('I already have an account'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
