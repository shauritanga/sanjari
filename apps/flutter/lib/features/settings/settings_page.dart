import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../auth/session_provider.dart';
import 'settings_controller.dart';
import 'settings_models.dart';

/// Settings hub. Ports apps/mobile/app/settings.tsx: personal-info row,
/// push toggles per category, language and visibility pickers, share link,
/// privacy rows, account rows, device sessions with revoke, and confirmed
/// logout. Sub-screens resolve to placeholders until their phases land.
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(ref.read(settingsControllerProvider).load);
  }

  Future<void> _pickLanguage() async {
    final locales = ref.read(localeProvider);
    final selected = await showDialog<AppLocale>(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(tr(locales.value, 'language')),
        children: [
          for (final option in AppLocale.values)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(option),
              child: Text(option.label),
            ),
        ],
      ),
    );
    if (selected == null || !mounted) return;
    locales.set(selected);
    await LanguageStore().save(selected);
  }

  Future<void> _pickVisibility() async {
    final controller = ref.read(settingsControllerProvider);
    final locale = ref.read(localeProvider).value;
    final selected = await showDialog<VisibilityMode>(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(tr(locale, 'whoCanSeeMe')),
        children: [
          for (final mode in VisibilityMode.values)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(mode),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tr(
                      locale,
                      mode == VisibilityMode.likedOnly
                          ? 'visibilityLikedOnly'
                          : 'visibilityEveryone',
                    ),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    tr(
                      locale,
                      mode == VisibilityMode.likedOnly
                          ? 'visibilityLikedOnlyCopy'
                          : 'visibilityEveryoneCopy',
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
    if (selected != null) await controller.selectVisibility(selected);
  }

  Future<void> _share() async {
    final message =
        await ref.read(settingsControllerProvider).shareMessage();
    if (message == null || !mounted) return;
    await SharePlus.instance.share(ShareParams(text: message));
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
    final controller = ref.read(settingsControllerProvider);
    controller.setLoggingOut(true);
    try {
      await ref.read(sessionProvider).logout();
    } finally {
      controller.setLoggingOut(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(settingsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'settings')),
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
              _Section(
                title: tr(locale, 'personalInfo'),
                child: _Row(
                  icon: Icons.person_outline,
                  title: tr(locale, 'personalInfoCopy'),
                  description: tr(locale, 'personalInfoHint'),
                  onTap: () => context.push('/settings/personal-info'),
                ),
              ),
              _Section(
                title: tr(locale, 'notifications'),
                hint: tr(locale, 'notificationsHint'),
                children: [
                  for (final preference in controller.preferences)
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        tr(locale, categoryKey(preference.category)),
                      ),
                      value: preference.push,
                      onChanged: (value) => controller.togglePush(
                        preference.category,
                        value,
                      ),
                    ),
                ],
              ),
              _Section(
                title: tr(locale, 'appSettings'),
                children: [
                  _Row(
                    icon: Icons.translate,
                    title: tr(locale, 'language'),
                    description: ref
                        .watch(localeProvider)
                        .value
                        .label,
                    onTap: _pickLanguage,
                  ),
                  _Row(
                    icon: Icons.lock_outline,
                    title: tr(locale, 'passcodeLock'),
                    description: tr(locale, 'passcodeLockCopy'),
                    onTap: () => context.push('/settings/passcode'),
                  ),
                  _Row(
                    icon: Icons.group_outlined,
                    title: tr(locale, 'chaperone'),
                    description: tr(locale, 'chaperoneCopy'),
                    onTap: () => context.push('/settings/chaperone'),
                  ),
                ],
              ),
              _Section(
                title: tr(locale, 'privacy'),
                children: [
                  _Row(
                    icon: Icons.visibility_outlined,
                    title: tr(locale, 'whoCanSeeMe'),
                    description: tr(
                      locale,
                      controller.visibilityMode ==
                              VisibilityMode.likedOnly
                          ? 'visibilityLikedOnly'
                          : 'visibilityEveryone',
                    ),
                    onTap: _pickVisibility,
                  ),
                  _Row(
                    icon: Icons.share_outlined,
                    title: tr(
                      locale,
                      controller.sharing
                          ? 'preparingLink'
                          : 'shareMyProfile',
                    ),
                    description: tr(locale, 'shareMyProfileCopy'),
                    onTap: controller.sharing ? null : _share,
                  ),
                  _Row(
                    icon: Icons.block_outlined,
                    title: tr(locale, 'blockedProfiles'),
                    description: tr(locale, 'blockedProfilesCopy'),
                    onTap: () => context.push('/settings/blocked'),
                  ),
                  _Row(
                    icon: Icons.contacts_outlined,
                    title: tr(locale, 'blockMyContacts'),
                    description: tr(locale, 'blockMyContactsCopy'),
                    onTap: () =>
                        context.push('/settings/contacts-block'),
                  ),
                  _Row(
                    icon: Icons.shield_outlined,
                    title: tr(locale, 'safetyCentre'),
                    description: tr(locale, 'safetyCentreCopy'),
                    onTap: () => context.push('/safety'),
                  ),
                ],
              ),
              _Section(
                title: tr(locale, 'accountSection'),
                children: [
                  _Row(
                    icon: Icons.workspace_premium_outlined,
                    title: tr(locale, 'membership'),
                    description: tr(locale, 'membershipCopy'),
                    onTap: () => context.push('/premium'),
                  ),
                  _Row(
                    icon: Icons.location_on_outlined,
                    title: tr(locale, 'discoveryPrefs'),
                    description: tr(locale, 'discoveryPrefsCopy'),
                    onTap: () => context.push('/filters'),
                  ),
                  _Row(
                    icon: Icons.description_outlined,
                    title: tr(locale, 'termsOfService'),
                    description: tr(locale, 'termsCopy'),
                    onTap: () =>
                        context.push('/settings/legal/terms'),
                  ),
                  _Row(
                    icon: Icons.privacy_tip_outlined,
                    title: tr(locale, 'privacyPolicy'),
                    description: tr(locale, 'privacyPolicyCopy'),
                    onTap: () => context.push(
                      '/settings/legal/privacy-policy',
                    ),
                  ),
                ],
              ),
              _Section(
                title: tr(locale, 'devices'),
                hint: tr(locale, 'devicesHint'),
                children: [
                  if (controller.sessions.isEmpty)
                    Text(tr(locale, 'noOtherSessions'))
                  else
                    for (final session in controller.sessions)
                      Row(
                        children: [
                          const Icon(Icons.smartphone, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              session.deviceLabel(
                                tr(locale, 'unknownDevice'),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          TextButton(
                            onPressed: () =>
                                controller.revokeSession(session.id),
                            child: Text(
                              tr(locale, 'signOutDevice'),
                              style: TextStyle(
                                color: Theme.of(context)
                                    .colorScheme
                                    .error,
                              ),
                            ),
                          ),
                        ],
                      ),
                ],
              ),
              const SizedBox(height: SanjariSpacing.sm),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor:
                      Theme.of(context).colorScheme.error,
                  side: BorderSide(
                    color: Theme.of(context).colorScheme.error,
                  ),
                  minimumSize: const Size.fromHeight(52),
                ),
                onPressed:
                    controller.loggingOut ? null : _confirmLogout,
                child: controller.loggingOut
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(tr(locale, 'logout')),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    this.hint,
    this.child,
    this.children = const [],
  });

  final String title;
  final String? hint;
  final Widget? child;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: SanjariSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: Theme.of(context).colorScheme.secondary,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (hint != null) ...[
              const SizedBox(height: 2),
              Text(hint!, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: SanjariSpacing.sm),
            if (child != null) child!,
            ...children,
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(description),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
