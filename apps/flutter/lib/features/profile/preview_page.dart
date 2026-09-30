import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/profile_detail_view.dart';
import '../auth/session_provider.dart';
import 'preview_repository.dart';
import 'profile_detail.dart';

final previewRepositoryProvider = Provider<PreviewRepository>((ref) {
  return PreviewRepository(ref.watch(sessionProvider).api);
});

/// Self preview screen. Ports apps/mobile/app/profile/preview.tsx: loads
/// GET /onboarding/preview and renders the shared detail view without the
/// like/pass footer, with the "how others see you" banner.
class PreviewPage extends ConsumerStatefulWidget {
  const PreviewPage({super.key});

  @override
  ConsumerState<PreviewPage> createState() => _PreviewPageState();
}

class _PreviewPageState extends ConsumerState<PreviewPage> {
  ProfileDetail? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final strings = ref.read(localeProvider);
    try {
      final profile =
          await ref.read(previewRepositoryProvider).fetchPreview();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = tr(strings.value, 'unableToLoadPreview');
        _loading = false;
      });
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
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              _error ?? tr(locale, 'unableToLoadPreview'),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Theme.of(context).colorScheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
    }
    return ProfileDetailView(
      profile: profile,
      onBack: () => context.pop(),
      banner: tr(locale, 'previewBanner'),
    );
  }
}
