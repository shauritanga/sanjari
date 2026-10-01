import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../../widgets/profile_detail_view.dart';
import '../auth/session_provider.dart';
import '../discover/candidate.dart';
import '../discover/discover_controller.dart';
import '../discover/match_dialog.dart';
import 'profile_detail.dart';
import 'profile_view_repository.dart';

final profileViewRepositoryProvider = Provider<ProfileViewRepository>((ref) {
  return ProfileViewRepository(ref.watch(sessionProvider).api);
});

/// Someone else's full profile, reached by tapping a card or via a deep
/// link. Ports apps/mobile/app/profile/[id].tsx: GET /discovery/profile/:id,
/// then like/pass/super-like plus Block/Report shortcuts to the profile
/// they came from.
class ProfileViewPage extends ConsumerStatefulWidget {
  const ProfileViewPage({super.key, required this.userId});

  final String userId;

  @override
  ConsumerState<ProfileViewPage> createState() => _ProfileViewPageState();
}

class _ProfileViewPageState extends ConsumerState<ProfileViewPage> {
  ProfileDetail? _profile;
  bool _loading = true;
  bool _notFound = false;
  bool _actionBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _notFound = false;
      _error = null;
    });
    try {
      final profile = await ref
          .read(profileViewRepositoryProvider)
          .fetchProfile(widget.userId);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _notFound = profile == null;
      });
    } catch (e) {
      if (!mounted) return;
      final locale = ref.read(localeProvider).value;
      final message = e is ApiException
          ? e.message
          : tr(locale, 'unableToLoadProfileDetail');
      setState(() {
        if (RegExp('not found', caseSensitive: false).hasMatch(message)) {
          _notFound = true;
        } else {
          _error = message;
        }
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _respond({required bool like, bool priority = false}) async {
    final profile = _profile;
    if (profile == null || _actionBusy) return;
    setState(() {
      _actionBusy = true;
      _error = null;
    });
    final repository = ref.read(discoveryRepositoryProvider);
    try {
      if (!like) {
        await repository.pass(profile.id);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      final result = await repository.like(profile.id, priority: priority);
      if (!mounted) return;
      if (result.matched) {
        await _showMatch(result, profile);
      } else {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      final locale = ref.read(localeProvider).value;
      setState(() {
        _error = e is ApiException
            ? e.message
            : tr(locale, 'unableToCompleteAction');
      });
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _showMatch(LikeResult result, ProfileDetail profile) async {
    final name = result.matchedUser?.displayName?.trim().isNotEmpty == true
        ? result.matchedUser!.displayName!.trim()
        : profile.safeName;
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
          } else {
            Navigator.of(context).pop();
          }
        },
        onKeepDiscovering: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _openBlock() {
    final profile = _profile;
    if (profile == null) return;
    final primaryPhoto = profile.photos.isEmpty
        ? null
        : profile.photos.firstWhere(
            (p) => p.isPrimary,
            orElse: () => profile.photos.first,
          );
    final photoUrl = primaryPhoto?.url ?? '';
    context.push(
      '/profile/block'
      '?userId=${Uri.encodeComponent(profile.id)}'
      '&displayName=${Uri.encodeComponent(profile.displayName ?? '')}'
      '&photoUrl=${Uri.encodeComponent(photoUrl)}'
      '&exitSteps=2',
    );
  }

  void _openReport() {
    final profile = _profile;
    if (profile == null) return;
    context.push(
      '/profile/report'
      '?userId=${Uri.encodeComponent(profile.id)}'
      '&displayName=${Uri.encodeComponent(profile.displayName ?? '')}'
      '&mode=report',
    );
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
    if (_notFound || profile == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    tr(locale, 'profileNotAvailable'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  AppButton(
                    label: tr(locale, 'goBack'),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return ProfileDetailView(
      profile: profile,
      onBack: () => Navigator.of(context).pop(),
      error: _error,
      actions: ProfileDetailActions(
        busy: _actionBusy,
        onPass: () => _respond(like: false),
        onSuperLike: () => _respond(like: true, priority: true),
        onLike: () => _respond(like: true),
        onBlock: _openBlock,
        onReport: _openReport,
      ),
    );
  }
}
