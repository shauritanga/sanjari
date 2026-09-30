import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import 'report_page.dart';

/// Block-a-profile confirmation. Ports apps/mobile/app/profile/block.tsx:
/// POST /blocks/:id, or hand off to ReportProfilePage in `mode: 'block'`
/// via "Report and Block".
class BlockProfilePage extends ConsumerStatefulWidget {
  const BlockProfilePage({
    super.key,
    required this.userId,
    this.displayName,
    this.photoUrl,
    this.exitSteps = 1,
  });

  final String userId;
  final String? displayName;
  final String? photoUrl;
  final int exitSteps;

  @override
  ConsumerState<BlockProfilePage> createState() => _BlockProfilePageState();
}

class _BlockProfilePageState extends ConsumerState<BlockProfilePage> {
  bool _busy = false;
  String? _error;

  String _name(AppLocale locale) {
    final trimmed = (widget.displayName ?? '').trim();
    return trimmed.isEmpty ? tr(locale, 'thisMember') : trimmed;
  }

  String _initials() {
    final trimmed = (widget.displayName ?? '').trim();
    if (trimmed.isEmpty) return '?';
    return trimmed
        .split(RegExp(r'\s+'))
        .take(2)
        .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
        .join();
  }

  void _exit() {
    final navigator = Navigator.of(context);
    for (var i = 0; i < widget.exitSteps && navigator.canPop(); i++) {
      navigator.pop(true);
    }
  }

  Future<void> _block() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(reportRepositoryProvider)
          .blockUser(widget.userId, 'Blocked from profile view.');
      if (mounted) _exit();
    } catch (e) {
      if (!mounted) return;
      final locale = ref.read(localeProvider).value;
      setState(() {
        _error = e is ApiException ? e.message : tr(locale, 'unableToBlock');
        _busy = false;
      });
    }
  }

  void _reportAndBlock() {
    context.push(
      '/profile/report'
      '?userId=${Uri.encodeComponent(widget.userId)}'
      '&displayName=${Uri.encodeComponent(widget.displayName ?? '')}'
      '&mode=block'
      '&exitSteps=${widget.exitSteps + 1}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final name = _name(locale);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: SanjariSpacing.xl,
          ),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(
                        radius: 60,
                        backgroundColor:
                            Theme.of(context).colorScheme.surfaceContainerHighest,
                        backgroundImage:
                            widget.photoUrl != null && widget.photoUrl!.isNotEmpty
                                ? NetworkImage(widget.photoUrl!)
                                : null,
                        child: widget.photoUrl == null || widget.photoUrl!.isEmpty
                            ? Text(
                                _initials(),
                                style: const TextStyle(
                                  fontSize: 40,
                                  fontWeight: FontWeight.w800,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(height: SanjariSpacing.md),
                      Text(
                        tr(locale, 'blockTitle').replaceAll('{name}', name),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: SanjariSpacing.sm),
                      Text(
                        tr(locale, 'blockCopy').replaceAll('{name}', name),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: SanjariSpacing.sm),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              SizedBox(
                width: double.infinity,
                child: AppButton(
                  label: tr(locale, 'block'),
                  busy: _busy,
                  onPressed: _block,
                ),
              ),
              const SizedBox(height: SanjariSpacing.sm),
              TextButton(
                onPressed: _busy ? null : _reportAndBlock,
                child: Text(tr(locale, 'reportAndBlock')),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: SanjariSpacing.md),
                child: Text(
                  tr(locale, 'falseReportWarning'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
