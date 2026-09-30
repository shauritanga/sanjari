import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';

/// Match celebration. Ports apps/mobile/app/match-celebration.tsx as a
/// dialog: spring-in initials avatar, name line, message / keep-discovering
/// actions.
class MatchDialog extends ConsumerStatefulWidget {
  const MatchDialog({
    super.key,
    required this.displayName,
    required this.onSendMessage,
    required this.onKeepDiscovering,
  });

  final String displayName;
  final VoidCallback onSendMessage;
  final VoidCallback onKeepDiscovering;

  @override
  ConsumerState<MatchDialog> createState() => _MatchDialogState();
}

class _MatchDialogState extends ConsumerState<MatchDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scale = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final initials = widget.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
        .join();

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SanjariRadius.xl),
      ),
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              tr(locale, 'matchTitle'),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            ScaleTransition(
              scale: _scale,
              child: CircleAvatar(
                radius: 48,
                backgroundColor: Theme.of(context).colorScheme.primary,
                child: Text(
                  initials.isEmpty ? '?' : initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: SanjariSpacing.lg),
            Text(
              tr(locale, 'matchCopy').replaceAll(
                '{name}',
                widget.displayName,
              ),
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: SanjariSpacing.xs),
            Text(
              tr(locale, 'matchCta'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: SanjariSpacing.lg),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: widget.onSendMessage,
                child: Text(tr(locale, 'sendMessage')),
              ),
            ),
            TextButton(
              onPressed: widget.onKeepDiscovering,
              child: Text(tr(locale, 'keepDiscovering')),
            ),
          ],
        ),
      ),
    );
  }
}
