import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'legal_docs.dart';

/// Shared legal document screen. Ports both
/// apps/mobile/app/settings/legal/terms.tsx and
/// apps/mobile/app/settings/legal/privacy-policy.tsx, which share the same
/// layout and differ only in title key and sections.
class LegalPage extends ConsumerWidget {
  const LegalPage({
    super.key,
    required this.titleKey,
    required this.sections,
  });

  final String titleKey;
  final List<LegalSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, titleKey)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(SanjariSpacing.lg),
        children: [
          for (final section in sections)
            Padding(
              padding: const EdgeInsets.only(
                bottom: SanjariSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    section.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    section.body,
                    style: const TextStyle(fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
