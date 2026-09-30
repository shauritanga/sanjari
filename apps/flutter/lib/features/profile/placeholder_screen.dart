import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/locale_controller.dart';

/// Placeholder for not-yet-ported profile-area screens (edit, preview,
/// settings, safety). Exists so hub navigation already resolves; each is
/// replaced by its real port in a later phase.
class PlaceholderScreen extends ConsumerWidget {
  const PlaceholderScreen({super.key, required this.titleKey});

  final String titleKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(tr(locale, titleKey))),
      body: Center(child: Text(tr(locale, 'comingSoon'))),
    );
  }
}
