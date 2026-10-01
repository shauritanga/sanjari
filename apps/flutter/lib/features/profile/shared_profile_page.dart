import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/profile_detail_view.dart';
import 'profile_detail.dart';
import 'profile_view_page.dart';

/// A profile shared via link. Ports
/// apps/mobile/app/profile/share/[token].tsx: GET /discovery/share/:token,
/// read-only (no like/pass/Block/Report), with a "Shared Sanjari profile"
/// banner.
class SharedProfilePage extends ConsumerStatefulWidget {
  const SharedProfilePage({super.key, required this.token});

  final String token;

  @override
  ConsumerState<SharedProfilePage> createState() => _SharedProfilePageState();
}

class _SharedProfilePageState extends ConsumerState<SharedProfilePage> {
  ProfileDetail? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final locale = ref.read(localeProvider).value;
    try {
      final profile = await ref
          .read(profileViewRepositoryProvider)
          .fetchSharedProfile(widget.token);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        if (profile == null) _error = tr(locale, 'linkNoLongerValid');
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error =
            e is ApiException ? e.message : tr(locale, 'linkNoLongerValid');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    final profile = _profile;
    if (_error != null || profile == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Text(
                _error ?? tr(locale, 'linkNoLongerValid'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      );
    }
    return ProfileDetailView(
      profile: profile,
      onBack: () => context.go('/home/discover'),
      banner: tr(locale, 'sharedProfileBanner'),
    );
  }
}
