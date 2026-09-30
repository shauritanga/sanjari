import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../discover/candidate.dart';
import '../discover/match_dialog.dart';
import 'like_received.dart';
import 'likes_controller.dart';

/// Who-liked-you list. Ports apps/mobile/app/(tabs)/likes.tsx: photo cards
/// with verified badge, city, super-like marker, comment, and Pass /
/// Like-back actions. A mutual match opens the shared MatchDialog.
class LikesPage extends ConsumerStatefulWidget {
  const LikesPage({super.key});

  @override
  ConsumerState<LikesPage> createState() => _LikesPageState();
}

class _LikesPageState extends ConsumerState<LikesPage> {
  @override
  void initState() {
    super.initState();
    final controller = ref.read(likesControllerProvider);
    controller.onMatch = _showMatch;
    Future.microtask(controller.load);
  }

  Future<void> _showMatch(LikeResult result, LikeReceived item) async {
    if (!mounted) return;
    final fallback = item.displayName?.trim().isNotEmpty == true
        ? item.displayName!.trim()
        : 'Your match';
    final name = result.matchedUser?.displayName?.trim().isNotEmpty == true
        ? result.matchedUser!.displayName!.trim()
        : fallback;
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

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(likesControllerProvider);

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
              tr(locale, 'likes'),
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
                    if (controller.likes.isEmpty &&
                        controller.error == null)
                      Padding(
                        padding: const EdgeInsets.only(
                          top: SanjariSpacing.xxl,
                        ),
                        child: Column(
                          children: [
                            Text(
                              tr(locale, 'noLikesTitle'),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: SanjariSpacing.sm),
                            Text(
                              tr(locale, 'noLikesCopy'),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    else
                      for (final item in controller.likes)
                        _LikeCard(item: item),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LikeCard extends ConsumerWidget {
  const _LikeCard({required this.item});

  final LikeReceived item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(likesControllerProvider);
    final busy = controller.busyUserId == item.userId;

    return Card(
      margin: const EdgeInsets.only(bottom: SanjariSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          children: [
            InkWell(
              onTap: () {},
              child: Row(
                children: [
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(
                        SanjariRadius.md,
                      ),
                      child: item.primaryPhoto?.url.isNotEmpty == true
                          ? Image.network(
                              item.primaryPhoto!.url,
                              fit: BoxFit.cover,
                              errorBuilder: (context, _, __) =>
                                  _InitialsAvatar(item: item),
                            )
                          : _InitialsAvatar(item: item),
                    ),
                  ),
                  const SizedBox(width: SanjariSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                item.safeName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            if (item.verificationStatus == 'verified')
                              Icon(
                                Icons.check_circle,
                                size: 18,
                                color: Theme.of(context)
                                    .colorScheme
                                    .primary,
                              ),
                          ],
                        ),
                        if (item.city != null)
                          Text(item.city!),
                        if (item.priority)
                          Row(
                            children: [
                              const Icon(
                                Icons.star,
                                size: 14,
                                color: SanjariColors.softGold,
                              ),
                              const SizedBox(width: 4),
                              Text(tr(locale, 'superLikeLabel')),
                            ],
                          ),
                        if (item.comment?.isNotEmpty == true)
                          Text('“${item.comment}”'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SanjariSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy
                        ? null
                        : () => controller.pass(item),
                    child: Text(tr(locale, 'pass')),
                  ),
                ),
                const SizedBox(width: SanjariSpacing.sm),
                Expanded(
                  child: FilledButton(
                    onPressed: busy
                        ? null
                        : () => controller.likeBack(item),
                    child: busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(tr(locale, 'likeBack')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.item});

  final LikeReceived item;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Text(
        item.initials(),
        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
      ),
    );
  }
}
