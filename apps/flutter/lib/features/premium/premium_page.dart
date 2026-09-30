import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'premium_controller.dart';

/// Membership screen. Ports apps/mobile/app/premium.tsx: server-verified
/// current status (status, plan + end date, enabled entitlements) and plan
/// cards whose purchase button explains the app-store flow.
class PremiumPage extends ConsumerStatefulWidget {
  const PremiumPage({super.key});

  @override
  ConsumerState<PremiumPage> createState() => _PremiumPageState();
}

class _PremiumPageState extends ConsumerState<PremiumPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(ref.read(premiumControllerProvider).load);
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(premiumControllerProvider);
    final status = controller.status;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'premiumTitle')),
      ),
      body: Builder(
        builder: (context) {
          if (controller.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(SanjariSpacing.lg),
            children: [
              Text(
                tr(locale, 'premiumTitle'),
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(tr(locale, 'premiumSubtitle')),
              const SizedBox(height: SanjariSpacing.md),
              if (controller.error != null)
                Padding(
                  padding:
                      const EdgeInsets.only(bottom: SanjariSpacing.sm),
                  child: Text(
                    tr(locale, controller.error!),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
              if (controller.notice != null)
                Padding(
                  padding:
                      const EdgeInsets.only(bottom: SanjariSpacing.sm),
                  child: Text(
                    tr(locale, controller.notice!),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.secondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(SanjariSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(locale, 'currentStatus'),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        status?.status ?? '…',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      if (status?.plan != null)
                        Text(
                          [
                            status!.plan!.title,
                            if (status.endsLabel() != null)
                              tr(locale, 'planEnds').replaceAll(
                                '{date}',
                                status.endsLabel()!,
                              ),
                          ].join(' · '),
                        ),
                      if (status != null &&
                          status.enabledEntitlements.isNotEmpty)
                        Text(status.enabledEntitlements.join(', ')),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: SanjariSpacing.md),
              for (final plan in controller.plans)
                Card(
                  margin: const EdgeInsets.only(
                    bottom: SanjariSpacing.sm,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(SanjariSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(plan.description),
                        const SizedBox(height: 4),
                        Text(
                          plan.priceLabel(),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: SanjariSpacing.sm),
                        OutlinedButton(
                          onPressed: controller.explainPurchase,
                          child: Text(
                            tr(locale, 'purchaseInStore'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
