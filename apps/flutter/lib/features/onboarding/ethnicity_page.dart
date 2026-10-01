import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/app_text_field.dart';
import '../../widgets/option_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_options.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

const _maxEthnicities = 3;

/// Ethnic/cultural background: searchable multi-select (up to 3) over
/// [ethnicityOptions], saves `ethnicities`.
class EthnicityPage extends ConsumerStatefulWidget {
  const EthnicityPage({super.key});

  @override
  ConsumerState<EthnicityPage> createState() => _EthnicityPageState();
}

class _EthnicityPageState extends ConsumerState<EthnicityPage> {
  final _query = TextEditingController();
  List<String> _selected = [];
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    _query.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _toggle(String value) {
    setState(() {
      if (_selected.contains(value)) {
        _selected = _selected.where((item) => item != value).toList();
      } else if (_selected.length < _maxEthnicities) {
        _selected = [..._selected, value];
      }
    });
  }

  Future<void> _save() async {
    if (_selected.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'ethnicities': _selected},
        stepNumber('ethnicity'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('height'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_seeded) {
      _seeded = true;
      _selected = List.of(
        ref.read(onboardingControllerProvider).draft.ethnicities,
      );
    }
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? ethnicityOptions
        : ethnicityOptions
            .where((option) => option.label.toLowerCase().contains(normalized))
            .toList();
    return OnboardingScreen(
      step: stepNumber('ethnicity'),
      title: "What's your ethnicity?",
      subtitle: 'Please tell us your ethnic and cultural background.',
      primaryLabel: 'Confirm (${_selected.length})',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Search for ethnicities',
            controller: _query,
            hint: 'Type an ethnicity',
          ),
          const SizedBox(height: 12),
          for (final option in filtered) ...[
            CheckRow(
              label: option.label,
              checked: _selected.contains(option.value),
              onTap: () => _toggle(option.value),
            ),
            const SizedBox(height: 4),
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
