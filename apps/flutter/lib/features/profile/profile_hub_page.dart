import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../auth/session_provider.dart';
import 'profile_controller.dart';
import 'profile_hub.dart';

/// Own-profile hub (view mode). Ports the ProfileHub branch of
/// apps/mobile/app/(tabs)/profile.tsx: header + settings shortcut,
/// identity card (avatar, name + age, badges, city, member-since,
/// completion, Edit/Preview), Settings and Safety rows, account note,
/// and confirmed logout. The full editor is a later phase; Edit/Preview
/// resolve to placeholder routes.
class ProfileHubPage extends ConsumerStatefulWidget {
  const ProfileHubPage({super.key});

  @override
  ConsumerState<ProfileHubPage> createState() => _ProfileHubPageState();
}

class _ProfileHubPageState extends ConsumerState<ProfileHubPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(ref.read(profileHubControllerProvider).load);
  }

  Future<void> _confirmLogout() async {
    final locale = ref.read(localeProvider).value;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(locale, 'logoutTitle')),
        content: Text(tr(locale, 'logoutCopy')),
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
            child: Text(tr(locale, 'logout')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final controller = ref.read(profileHubControllerProvider);
    controller.setLoggingOut(true);
    try {
      await ref.read(sessionProvider).logout();
      // The router guard redirects to /auth/login on session loss.
    } finally {
      controller.setLoggingOut(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(profileHubControllerProvider);
    final state = controller.state;
    final profile = state.profile;
    final photo = profile.primaryPhoto;
    final since = memberSinceLabel(state.memberSince);
    final score = state.completionScore.clamp(0, 100);

    return SafeArea(
      child: Builder(
        builder: (context) {
          if (controller.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (controller.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: SanjariSpacing.xl,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      tr(locale, controller.error!),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                    const SizedBox(height: SanjariSpacing.md),
                    FilledButton(
                      onPressed: controller.load,
                      child: Text(tr(locale, 'tryAgain')),
                    ),
                  ],
                ),
              ),
            );
          }
          final displayName = profile.displayName?.trim().isNotEmpty == true
              ? profile.displayName!.trim()
              : tr(locale, 'yourProfile');
          return ListView(
            padding: const EdgeInsets.all(SanjariSpacing.lg),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(locale, 'account'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        tr(locale, 'profile'),
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  IconButton.filledTonal(
                    tooltip: tr(locale, 'settingsTitle'),
                    icon: const Icon(HugeIcons.strokeRoundedSettings01),
                    onPressed: () => context.push('/settings'),
                  ),
                ],
              ),
              const SizedBox(height: SanjariSpacing.md),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(SanjariSpacing.lg),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundImage: photo?.url?.isNotEmpty == true
                            ? NetworkImage(photo!.url!)
                            : null,
                        child: photo?.url?.isNotEmpty == true
                            ? null
                            : Text(
                                profile.initial,
                                style: const TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              state.age != null
                                  ? '$displayName, ${state.age}'
                                  : displayName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (controller.photoVerified || controller.idVerified)
                            const Padding(
                              padding: EdgeInsets.only(left: 6),
                              child: Icon(
                                  HugeIcons.strokeRoundedCheckmarkBadge01,
                                  size: 20),
                            ),
                        ],
                      ),
                      Text(
                        profile.city ?? tr(locale, 'sanjariMember'),
                      ),
                      if (since != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(HugeIcons.strokeRoundedCalendar03,
                                size: 13),
                            const SizedBox(width: 4),
                            Text(since),
                          ],
                        ),
                      ],
                      const SizedBox(height: SanjariSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: LinearProgressIndicator(
                              value: score / 100,
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          const SizedBox(width: SanjariSpacing.sm),
                          Text(
                            tr(locale, 'profileComplete').replaceAll(
                              '{score}',
                              '$score',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        score >= 100
                            ? tr(locale, 'profileCompleteDone')
                            : tr(locale, 'profileCompleteHint'),
                      ),
                      const SizedBox(height: SanjariSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton(
                              onPressed: () => context.push('/profile/edit'),
                              child: Text(tr(locale, 'editProfile')),
                            ),
                          ),
                          const SizedBox(width: SanjariSpacing.sm),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/profile/preview'),
                              icon: const Icon(HugeIcons.strokeRoundedView,
                                  size: 16),
                              label: Text(tr(locale, 'preview')),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: SanjariSpacing.md),
              _HubRow(
                icon: HugeIcons.strokeRoundedSettings01,
                title: tr(locale, 'settingsTitle'),
                description: tr(locale, 'settingsCopy'),
                onTap: () => context.push('/settings'),
              ),
              _HubRow(
                icon: HugeIcons.strokeRoundedShield01,
                title: tr(locale, 'safetyTitle'),
                description: tr(locale, 'safetyCopy'),
                onTap: () => context.push('/safety'),
              ),
              const SizedBox(height: SanjariSpacing.md),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(SanjariSpacing.md),
                  child: Row(
                    children: [
                      Icon(
                        HugeIcons.strokeRoundedCheckmarkBadge01,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: SanjariSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tr(locale, 'accountNoteTitle'),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(tr(locale, 'accountNoteBody')),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: SanjariSpacing.md),
              Center(
                child: controller.loggingOut
                    ? const CircularProgressIndicator()
                    : TextButton(
                        onPressed: _confirmLogout,
                        child: Text(tr(locale, 'logout')),
                      ),
              ),
              Center(
                child: Text(
                  tr(
                    locale,
                    publishStatusKey(state.onboardingStatus),
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

class _HubRow extends StatelessWidget {
  const _HubRow({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: SanjariSpacing.sm),
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(description),
        trailing: const Icon(HugeIcons.strokeRoundedArrowRight01),
        onTap: onTap,
      ),
    );
  }
}
