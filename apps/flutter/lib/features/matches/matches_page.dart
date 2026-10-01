import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'match.dart';
import 'matches_controller.dart';

/// Mutual matches list. Ports apps/mobile/app/(tabs)/matches.tsx: New
/// badge (48h), city, conversation setup hint, and Unmatch (confirmed) /
/// Block / Report actions.
class MatchesPage extends ConsumerStatefulWidget {
  const MatchesPage({super.key});

  @override
  ConsumerState<MatchesPage> createState() => _MatchesPageState();
}

class _MatchesPageState extends ConsumerState<MatchesPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(ref.read(matchesControllerProvider).load);
  }

  void _openBlock(Match match) {
    context.push(
      '/profile/block'
      '?userId=${Uri.encodeComponent(match.user.id)}'
      '&displayName='
      '${Uri.encodeComponent(match.user.profile?.displayName ?? '')}'
      '&exitSteps=1',
    );
  }

  void _openReport(Match match) {
    context.push(
      '/profile/report'
      '?userId=${Uri.encodeComponent(match.user.id)}'
      '&displayName='
      '${Uri.encodeComponent(match.user.profile?.displayName ?? '')}'
      '&mode=report'
      '&exitSteps=1',
    );
  }

  Future<void> _confirmUnmatch(Match match) async {
    final locale = ref.read(localeProvider).value;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(locale, 'unmatch')),
        content: Text(
          tr(locale, 'unmatchConfirm').replaceAll('{name}', match.safeName),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(tr(locale, 'cancel')),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(tr(locale, 'unmatch')),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(matchesControllerProvider).unmatch(match);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(matchesControllerProvider);
    final now = DateTime.now();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              SanjariSpacing.lg,
              SanjariSpacing.sm,
              SanjariSpacing.lg,
              SanjariSpacing.xs,
            ),
            child: Text(
              tr(locale, 'matches'),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
          Expanded(
            child: Builder(
              builder: (context) {
                if (controller.loading) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }
                return ListView(
                  padding: const EdgeInsets.all(SanjariSpacing.lg),
                  children: [
                    if (controller.error != null) ...[
                      Text(
                        tr(locale, controller.error!),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                    ],
                    if (controller.matches.isEmpty && controller.error == null)
                      Padding(
                        padding: const EdgeInsets.only(
                          top: SanjariSpacing.xxl,
                        ),
                        child: Text(
                          tr(locale, 'matchesEmpty'),
                          textAlign: TextAlign.center,
                        ),
                      )
                    else
                      for (final match in controller.matches)
                        _MatchCard(
                          match: match,
                          isNew: _isNew(match, now),
                          busy: controller.busyMatchId == match.id,
                          onOpen: match.canOpen
                              ? () => context.go(
                                    '/conversation/${match.conversationId}',
                                  )
                              : null,
                          onUnmatch: () => _confirmUnmatch(match),
                          onBlock: () => _openBlock(match),
                          onReport: () => _openReport(match),
                        ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  bool _isNew(Match match, DateTime now) {
    final created = DateTime.tryParse(match.createdAt);
    if (created == null) return false;
    return isNewMatch(created, now);
  }
}

class _MatchCard extends ConsumerWidget {
  const _MatchCard({
    required this.match,
    required this.isNew,
    required this.busy,
    required this.onOpen,
    required this.onUnmatch,
    required this.onBlock,
    required this.onReport,
  });

  final Match match;
  final bool isNew;
  final bool busy;
  final VoidCallback? onOpen;
  final VoidCallback onUnmatch;
  final VoidCallback onBlock;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    final city = match.user.profile?.city;

    return Card(
      margin: const EdgeInsets.only(bottom: SanjariSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: onOpen,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          match.safeName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (isNew)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            tr(locale, 'newBadge'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  Text(
                    city ?? tr(locale, 'locationNotShared'),
                  ),
                  if (!match.canOpen)
                    Text(
                      tr(locale, 'conversationSetup'),
                      style: const TextStyle(fontStyle: FontStyle.italic),
                    ),
                ],
              ),
            ),
            const SizedBox(height: SanjariSpacing.sm),
            Wrap(
              spacing: SanjariSpacing.sm,
              children: [
                OutlinedButton(
                  onPressed: busy ? null : onUnmatch,
                  child: Text(tr(locale, 'unmatch')),
                ),
                OutlinedButton(
                  onPressed: onBlock,
                  child: Text(tr(locale, 'block')),
                ),
                OutlinedButton(
                  onPressed: onReport,
                  child: Text(tr(locale, 'report')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
