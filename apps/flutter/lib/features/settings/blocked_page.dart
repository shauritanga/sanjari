import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'blocked_controller.dart';

/// Blocked profiles list. Ports apps/mobile/app/settings/blocked.tsx:
/// avatar rows with per-row unblock, optimistic removal, and an empty
/// state. Replaces the /settings/blocked placeholder.
class BlockedPage extends ConsumerStatefulWidget {
  const BlockedPage({super.key});

  @override
  ConsumerState<BlockedPage> createState() => _BlockedPageState();
}

class _BlockedPageState extends ConsumerState<BlockedPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(ref.read(blockedControllerProvider).load);
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(blockedControllerProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'blockedProfiles')),
      ),
      body: Builder(
        builder: (context) {
          if (controller.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(SanjariSpacing.lg),
            children: [
              if (controller.error != null)
                Padding(
                  padding:
                      const EdgeInsets.only(bottom: SanjariSpacing.sm),
                  child: Text(
                    tr(locale, controller.error!),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              if (controller.blocked.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 64),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.block_outlined,
                        size: 32,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        tr(locale, 'noBlocked'),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else
                for (final item in controller.blocked)
                  Card(
                    margin: const EdgeInsets.only(
                      bottom: SanjariSpacing.sm,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(SanjariSpacing.md),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundImage:
                                item.photoUrl?.isNotEmpty == true
                                    ? NetworkImage(item.photoUrl!)
                                    : null,
                            child: item.photoUrl?.isNotEmpty == true
                                ? null
                                : const Icon(
                                    Icons.block_outlined,
                                    size: 18,
                                  ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.safeName(
                                tr(locale, 'sanjariMember'),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          controller.unblockingId == item.blockedId
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : TextButton(
                                  onPressed: () => controller.unblock(
                                    item.blockedId,
                                  ),
                                  child: Text(
                                    tr(locale, 'unblock'),
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
