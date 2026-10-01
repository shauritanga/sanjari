import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/locale_controller.dart';
import '../auth/session_provider.dart';
import '../discover/discover_page.dart';
import '../inbox/inbox_page.dart';
import '../profile/profile_hub_page.dart';
import '../likes/likes_page.dart';
import '../matches/matches_page.dart';

/// Bottom-navigation shell. Port of apps/mobile/app/(tabs)/_layout.tsx.
/// All five tabs host real UI. The profile tab is the view-mode hub; the
/// full editor, preview, settings, and safety screens are later phases.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.tab});

  final String tab;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

const _tabs = ['discover', 'likes', 'matches', 'messages', 'profile'];

const _tabKeys = ['discover', 'likes', 'matches', 'messages', 'profile'];

const _tabIcons = [
  HugeIcons.strokeRoundedCompass,
  HugeIcons.strokeRoundedFavourite,
  HugeIcons.strokeRoundedUserGroup,
  HugeIcons.strokeRoundedBubbleChat,
  HugeIcons.strokeRoundedUser,
];

const _tabSelectedIcons = [
  HugeIcons.strokeRoundedCompass,
  HugeIcons.strokeRoundedFavourite,
  HugeIcons.strokeRoundedUserGroup,
  HugeIcons.strokeRoundedBubbleChat,
  HugeIcons.strokeRoundedUser,
];

class _HomeShellState extends ConsumerState<HomeShell> {
  int get _index => _tabs.contains(widget.tab) ? _tabs.indexOf(widget.tab) : 0;

  List<Widget> _actions(AppLocale locale) {
    return [
      IconButton(
        tooltip: tr(locale, 'language'),
        icon: const Icon(HugeIcons.strokeRoundedLanguageCircle),
        onPressed: () {
          final controller = ref.read(localeProvider);
          controller.set(
            controller.value == AppLocale.english
                ? AppLocale.swahili
                : AppLocale.english,
          );
        },
      ),
      IconButton(
        tooltip: tr(locale, 'logout'),
        icon: const Icon(HugeIcons.strokeRoundedLogout01),
        onPressed: () async {
          await ref.read(sessionProvider).logout();
          if (mounted) context.go('/auth/login');
        },
      ),
    ];
  }

  NavigationBar _nav(AppLocale locale) {
    return NavigationBar(
      selectedIndex: _index,
      onDestinationSelected: (i) => context.go('/home/${_tabs[i]}'),
      destinations: [
        for (var i = 0; i < _tabKeys.length; i++)
          NavigationDestination(
            icon: Icon(_tabIcons[i]),
            selectedIcon: Icon(_tabSelectedIcons[i]),
            label: tr(locale, _tabKeys[i]),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    switch (_tabs[_index]) {
      case 'discover':
        return Scaffold(
          body: const DiscoverPage(),
          bottomNavigationBar: _nav(locale),
        );
      case 'likes':
        return Scaffold(
          body: const LikesPage(),
          bottomNavigationBar: _nav(locale),
        );
      case 'matches':
        return Scaffold(
          body: const MatchesPage(),
          bottomNavigationBar: _nav(locale),
        );
      case 'messages':
        return Scaffold(
          body: const InboxPage(),
          bottomNavigationBar: _nav(locale),
        );
      case 'profile':
        return Scaffold(
          body: const ProfileHubPage(),
          bottomNavigationBar: _nav(locale),
        );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(locale, _tabKeys[_index])),
        actions: _actions(locale),
      ),
      body: Center(child: Text(tr(locale, 'comingSoon'))),
      bottomNavigationBar: _nav(locale),
    );
  }
}
