import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/option_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Shared single-select list page behind the short fixed-option screens
/// (education, marital status, smoking, drinking, children): tapping a row
/// saves immediately and advances, mirroring GenderPage's tap-to-advance
/// cards rather than a separate Continue button.
class SingleSelectListPage extends ConsumerStatefulWidget {
  const SingleSelectListPage({
    super.key,
    required this.stepKey,
    required this.title,
    required this.field,
    required this.options,
    required this.nextKey,
  });

  final String stepKey;
  final String title;
  final String field;
  final List<SelectOption> options;
  final String nextKey;

  @override
  ConsumerState<SingleSelectListPage> createState() =>
      _SingleSelectListPageState();
}

class _SingleSelectListPageState extends ConsumerState<SingleSelectListPage> {
  String? _saving;
  String? _error;

  Future<void> _select(String value) async {
    setState(() {
      _saving = value;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {widget.field: value},
        stepNumber(widget.stepKey),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep(widget.nextKey));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber(widget.stepKey),
      title: widget.title,
      primaryLabel: 'Continue',
      onPrimary: () {},
      showPrimary: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final option in widget.options) ...[
            OptionRow(
              label: option.label,
              active: option.value == _saving,
              onTap: _saving == null ? () => _select(option.value) : () {},
            ),
            const SizedBox(height: 8),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: scheme.error)),
          ],
        ],
      ),
    );
  }
}
