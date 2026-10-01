import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'candidate.dart';
import 'discover_controller.dart';
import 'match_dialog.dart';
import 'swipe_card.dart';

/// Discovery screen. Port of apps/mobile/app/(tabs)/discover.tsx:
/// header + filters entry, banner, loading/error/empty states, swipe deck,
/// pass/undo/super-like/like actions, and block/report shortcuts.
class DiscoverPage extends ConsumerStatefulWidget {
  const DiscoverPage({super.key});

  @override
  ConsumerState<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends ConsumerState<DiscoverPage> {
  @override
  void initState() {
    super.initState();
    final controller = ref.read(discoverControllerProvider);
    controller.onMatch = _showMatch;
    Future.microtask(() {
      final filters = ref.read(discoveryFiltersProvider);
      controller.refresh(
        recentlyActive: filters.recentlyActive,
        newMembers: filters.newMembers,
      );
    });
    ref.listenManual(
      discoveryFiltersProvider,
      (previous, next) {
        if (previous?.recentlyActive != next.recentlyActive ||
            previous?.newMembers != next.newMembers) {
          ref.read(discoverControllerProvider).refresh(
                recentlyActive: next.recentlyActive,
                newMembers: next.newMembers,
              );
        }
      },
    );
  }

  Future<void> _showMatch(LikeResult result) async {
    if (!mounted) return;
    final name = result.matchedUser?.displayName?.trim().isNotEmpty == true
        ? result.matchedUser!.displayName!.trim()
        : 'Your match';
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MatchDialog(
        displayName: name,
        onSendMessage: () {
          Navigator.of(context).pop();
          final conversationId = result.conversationId;
          if (conversationId != null && conversationId.isNotEmpty) {
            context.go('/conversation/$conversationId');
          }
        },
        onKeepDiscovering: () => Navigator.of(context).pop(),
      ),
    );
  }

  void _openProfile(Candidate candidate) {
    context.push('/profile/${candidate.id}');
  }

  Future<void> _openBlock(Candidate candidate) async {
    final result = await context.push<bool>(
      '/profile/block'
      '?userId=${Uri.encodeComponent(candidate.id)}'
      '&displayName=${Uri.encodeComponent(candidate.displayName ?? '')}'
      '&photoUrl=${Uri.encodeComponent(candidate.primaryPhoto?.url ?? '')}'
      '&exitSteps=1',
    );
    // The block screen is pushed on top of this one; once the user returns
    // having blocked someone, refresh so the (now-excluded) candidate stops
    // showing up, mirroring the useFocusEffect in discover.tsx.
    if (result == true && mounted) {
      final filters = ref.read(discoveryFiltersProvider);
      await ref.read(discoverControllerProvider).refresh(
            recentlyActive: filters.recentlyActive,
            newMembers: filters.newMembers,
          );
    }
  }

  void _openReport(Candidate candidate) {
    context.push(
      '/profile/report'
      '?userId=${Uri.encodeComponent(candidate.id)}'
      '&displayName=${Uri.encodeComponent(candidate.displayName ?? '')}'
      '&mode=report'
      '&exitSteps=1',
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(discoverControllerProvider);
    final current = controller.current;

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              SanjariSpacing.lg,
              SanjariSpacing.sm,
              SanjariSpacing.lg,
              0,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(locale, 'discover').toUpperCase(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      tr(locale, 'findYourMatch'),
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                    ),
                  ],
                ),
                IconButton.filledTonal(
                  tooltip: tr(locale, 'openFilters'),
                  icon: const Icon(HugeIcons.strokeRoundedFilter),
                  onPressed: () => context.push('/filters'),
                ),
              ],
            ),
          ),
          if (controller.banner != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                SanjariSpacing.lg,
                SanjariSpacing.sm,
                SanjariSpacing.lg,
                0,
              ),
              child: SizedBox(
                width: double.infinity,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    child: Text(tr(locale, controller.banner!)),
                  ),
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
                if (controller.error != null) {
                  return _CenteredMessage(
                    icon: HugeIcons.strokeRoundedAlertCircle,
                    iconColor: Theme.of(context).colorScheme.error,
                    title: tr(locale, controller.error!),
                    actionLabel: tr(locale, 'tryAgain'),
                    onAction: () {
                      final filters = ref.read(discoveryFiltersProvider);
                      controller.refresh(
                        recentlyActive: filters.recentlyActive,
                        newMembers: filters.newMembers,
                      );
                    },
                  );
                }
                if (current == null) {
                  return _CenteredMessage(
                    icon: HugeIcons.strokeRoundedSearch01,
                    title: tr(locale, 'noProfilesTitle'),
                    copy: tr(locale, 'noProfilesCopy'),
                    actionLabel: tr(locale, 'refresh'),
                    onAction: () {
                      final filters = ref.read(discoveryFiltersProvider);
                      controller.refresh(
                        recentlyActive: filters.recentlyActive,
                        newMembers: filters.newMembers,
                      );
                    },
                  );
                }
                return Padding(
                  padding: const EdgeInsets.fromLTRB(
                    SanjariSpacing.lg,
                    12,
                    SanjariSpacing.lg,
                    0,
                  ),
                  child: SwipeCard(
                    key: ValueKey(current.id),
                    candidate: current,
                    onSwipeLeft: controller.passCurrent,
                    onSwipeRight: () => controller.likeCurrent(priority: false),
                    onTap: () => _openProfile(current),
                  ),
                );
              },
            ),
          ),
          if (!controller.loading &&
              controller.error == null &&
              current != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                SanjariSpacing.lg,
                SanjariSpacing.sm,
                SanjariSpacing.lg,
                SanjariSpacing.md,
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _RoundAction(
                        tooltip: tr(locale, 'pass'),
                        icon: HugeIcons.strokeRoundedCancel01,
                        color: SanjariColors.error,
                        onPressed:
                            controller.busy ? null : controller.passCurrent,
                      ),
                      const SizedBox(width: SanjariSpacing.md),
                      _RoundAction(
                        tooltip: tr(locale, 'undo'),
                        icon: HugeIcons.strokeRoundedUndo,
                        color: SanjariColors.softGold,
                        small: true,
                        busy: controller.undoing,
                        onPressed: controller.canUndo ? controller.undo : null,
                      ),
                      const SizedBox(width: SanjariSpacing.md),
                      _RoundAction(
                        tooltip: tr(locale, 'superLike'),
                        icon: HugeIcons.strokeRoundedStar,
                        color: SanjariColors.deepPlum,
                        small: true,
                        onPressed: controller.busy
                            ? null
                            : () => controller.likeCurrent(
                                  priority: true,
                                ),
                      ),
                      const SizedBox(width: SanjariSpacing.md),
                      _RoundAction(
                        tooltip: tr(locale, 'like'),
                        icon: HugeIcons.strokeRoundedFavourite,
                        filled: true,
                        onPressed: controller.busy
                            ? null
                            : () => controller.likeCurrent(
                                  priority: false,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: SanjariSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => _openBlock(current),
                        child: Text(tr(locale, 'block')),
                      ),
                      TextButton(
                        onPressed: () => _openReport(current),
                        child: Text(tr(locale, 'report')),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _CenteredMessage extends StatelessWidget {
  const _CenteredMessage({
    required this.icon,
    required this.title,
    this.copy,
    required this.actionLabel,
    required this.onAction,
    this.iconColor,
  });

  final IconData icon;
  final Color? iconColor;
  final String title;
  final String? copy;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: SanjariSpacing.xl,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: iconColor),
          const SizedBox(height: SanjariSpacing.md),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          if (copy != null) ...[
            const SizedBox(height: SanjariSpacing.sm),
            Text(copy!, textAlign: TextAlign.center),
          ],
          const SizedBox(height: SanjariSpacing.md),
          FilledButton(onPressed: onAction, child: Text(actionLabel)),
        ],
      ),
    );
  }
}

class _RoundAction extends StatelessWidget {
  const _RoundAction({
    required this.tooltip,
    required this.icon,
    this.color,
    this.small = false,
    this.filled = false,
    this.busy = false,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final Color? color;
  final bool small;
  final bool filled;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final size = small ? 44.0 : 56.0;
    final child = busy
        ? const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : Icon(
            icon,
            size: small ? 18 : 24,
            color: filled ? Colors.white : color,
          );
    final button = filled
        ? FilledButton(
            style: FilledButton.styleFrom(
              shape: const CircleBorder(),
              padding: EdgeInsets.all(size / 2 - 12),
            ),
            onPressed: busy ? null : onPressed,
            child: child,
          )
        : IconButton(
            tooltip: tooltip,
            style: IconButton.styleFrom(
              backgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerHighest,
              fixedSize: Size(size, size),
            ),
            onPressed: busy ? null : onPressed,
            icon: child,
          );
    return Tooltip(message: tooltip, child: button);
  }
}
