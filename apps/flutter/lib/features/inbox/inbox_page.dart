import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'conversation_summary.dart';
import 'inbox_controller.dart';

/// Conversations inbox. Ports apps/mobile/app/(tabs)/messages.tsx: loading /
/// error / empty states, pull-to-refresh, avatar rows with name, relative
/// timestamp, preview, unread badge, and tap-through to the conversation.
/// Live `message.new` updates arrive through the shared realtime service.
class InboxPage extends ConsumerStatefulWidget {
  const InboxPage({super.key});

  @override
  ConsumerState<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends ConsumerState<InboxPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final controller = ref.read(inboxControllerProvider);
      await controller.load();
      if (!mounted) return;
      await controller.attachRealtime(ref.read(realtimeServiceProvider));
    });
  }

  @override
  void dispose() {
    // Detach room subscriptions; the shared socket itself stays alive.
    ref.read(inboxControllerProvider).detachRealtime();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(inboxControllerProvider);

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
              tr(locale, 'messages'),
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
                if (controller.error != null &&
                    controller.items.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: SanjariSpacing.xl,
                      ),
                      child: Text(
                        tr(locale, controller.error!),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  );
                }
                if (controller.items.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: SanjariSpacing.xl,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.chat_bubble_outline,
                            size: 40,
                          ),
                          const SizedBox(height: SanjariSpacing.sm),
                          Text(
                            tr(locale, 'messagesEmpty'),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () => controller.load(silent: true),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      SanjariSpacing.lg,
                      0,
                      SanjariSpacing.lg,
                      SanjariSpacing.xl,
                    ),
                    itemCount: controller.items.length,
                    separatorBuilder: (context, _) => const SizedBox(
                      height: SanjariSpacing.sm,
                    ),
                    itemBuilder: (context, index) => _InboxRow(
                      item: controller.items[index],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _InboxRow extends ConsumerWidget {
  const _InboxRow({required this.item});

  final ConversationSummary item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    final hasUnread = item.unreadCount > 0;
    final name = item.safeName();
    final last = item.lastMessage;
    final preview = last == null
        ? tr(locale, 'sayHello')
        : (last.body ?? tr(locale, 'messageRemoved'));

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(SanjariRadius.lg),
        onTap: () => context.go('/conversation/${item.id}'),
        child: Padding(
          padding: const EdgeInsets.all(SanjariSpacing.md),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                child: Text(
                  name.trim().isEmpty
                      ? '?'
                      : name.trim()[0].toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.w700),
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
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: hasUnread
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                            ),
                          ),
                        ),
                        if (last != null)
                          Text(
                            _timestamp(
                              last.createdAt,
                              tr(locale, 'justNow'),
                            ),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: hasUnread
                                  ? FontWeight.w800
                                  : FontWeight.w400,
                            ),
                          ),
                        ),
                        if (hasUnread)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 20,
                              minHeight: 20,
                            ),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              item.unreadCount > 99
                                  ? '99+'
                                  : '${item.unreadCount}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _timestamp(String iso, String justNow) {
    final date = DateTime.tryParse(iso);
    if (date == null) return '';
    return formatRelativeTime(date, DateTime.now(), justNow: justNow);
  }
}
