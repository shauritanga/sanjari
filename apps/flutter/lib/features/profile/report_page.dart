import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../auth/session_provider.dart';
import 'report_repository.dart';

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  return ReportRepository(ref.watch(sessionProvider).api);
});

const _reportReasons = [
  ('impersonation', 'reportReasonImpersonation'),
  ('violence', 'reportReasonViolence'),
  ('underage_concern', 'reportReasonUnderage'),
  ('sexual_content', 'reportReasonSexualContent'),
  ('privacy_violation', 'reportReasonPrivacy'),
];

/// Report-a-profile reason picker. Ports apps/mobile/app/profile/report.tsx:
/// POST /reports, and when opened in `mode: 'block'` (from BlockProfilePage's
/// "Report and Block") also POST /blocks/:id before exiting.
class ReportProfilePage extends ConsumerStatefulWidget {
  const ReportProfilePage({
    super.key,
    required this.userId,
    this.mode = 'report',
    this.exitSteps = 1,
  });

  final String userId;
  final String mode;
  final int exitSteps;

  @override
  ConsumerState<ReportProfilePage> createState() => _ReportProfilePageState();
}

class _ReportProfilePageState extends ConsumerState<ReportProfilePage> {
  String? _selected;
  bool _busy = false;
  String? _error;

  void _exit() {
    final navigator = Navigator.of(context);
    for (var i = 0; i < widget.exitSteps && navigator.canPop(); i++) {
      navigator.pop(true);
    }
  }

  Future<void> _submit() async {
    final selected = _selected;
    if (selected == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final locale = ref.read(localeProvider).value;
    final label = tr(
      locale,
      _reportReasons.firstWhere((r) => r.$1 == selected).$2,
    );
    try {
      final repository = ref.read(reportRepositoryProvider);
      await repository.submitReport(
        widget.userId,
        selected,
        'Reported from profile view ($label).',
      );
      if (widget.mode == 'block') {
        await repository.blockUser(
          widget.userId,
          'Reported and blocked from profile view.',
        );
      }
      if (mounted) _exit();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException ? e.message : tr(locale, 'unableToSubmitReport');
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(tr(locale, 'reportReasonTitle'))),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: RadioGroup<String>(
                groupValue: _selected,
                onChanged: (value) => setState(() => _selected = value),
                child: ListView(
                  padding: const EdgeInsets.all(SanjariSpacing.lg),
                  children: [
                    for (final reason in _reportReasons)
                      RadioListTile<String>(
                        value: reason.$1,
                        title: Text(
                          tr(locale, reason.$2),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(SanjariRadius.lg),
                          side: BorderSide(
                            color: Theme.of(context).colorScheme.outline,
                          ),
                        ),
                      ),
                    if (_error != null)
                      Padding(
                        padding:
                            const EdgeInsets.only(top: SanjariSpacing.sm),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                SanjariSpacing.lg,
                0,
                SanjariSpacing.lg,
                SanjariSpacing.md,
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: AppButton(
                      label: tr(locale, 'continueAction'),
                      busy: _busy,
                      onPressed: _selected == null ? null : _submit,
                    ),
                  ),
                  const SizedBox(height: SanjariSpacing.sm),
                  Text(
                    tr(locale, 'falseReportWarning'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
