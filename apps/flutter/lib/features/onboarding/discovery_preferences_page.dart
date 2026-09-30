import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/stepper.dart';
import '../../widgets/toggle_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Match-preference fine-tuning. Port of
/// apps/mobile/app/onboarding/discovery-preferences.tsx: the age ends stay
/// ordered (raising min past max pulls max up and vice versa), then one
/// merged save before routing to location.
class DiscoveryPreferencesPage extends ConsumerStatefulWidget {
  const DiscoveryPreferencesPage({super.key});

  @override
  ConsumerState<DiscoveryPreferencesPage> createState() =>
      _DiscoveryPreferencesPageState();
}

class _DiscoveryPreferencesPageState
    extends ConsumerState<DiscoveryPreferencesPage> {
  int _minAge = 18;
  int _maxAge = 80;
  int _maxDistanceKm = 50;
  bool _showDistance = true;
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  void _changeMinAge(int value) {
    setState(() {
      _minAge = value;
      if (value > _maxAge) _maxAge = value;
    });
  }

  void _changeMaxAge(int value) {
    setState(() {
      _maxAge = value;
      if (value < _minAge) _minAge = value;
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.saveDiscoveryPreference({
        'minAge': _minAge,
        'maxAge': _maxAge,
        'maxDistanceKm': _maxDistanceKm,
        'showDistance': _showDistance,
      });
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('location'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(onboardingControllerProvider).draft;
    if (!_seeded) {
      _seeded = true;
      _minAge = draft.discoveryPreference.minAge;
      _maxAge = draft.discoveryPreference.maxAge;
      _maxDistanceKm = draft.discoveryPreference.maxDistanceKm;
      _showDistance = draft.discoveryPreference.showDistance;
    }
    return OnboardingScreen(
      step: stepNumber('discovery-preferences'),
      title: 'Your match preferences',
      subtitle:
          'Who you want to meet is already set — just fine-tune age range and distance.',
      primaryLabel: 'Continue',
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: _error,
      child: Column(
        children: [
          NumberStepper(
            label: 'Minimum age',
            value: _minAge,
            min: 18,
            max: 99,
            onChanged: _changeMinAge,
          ),
          NumberStepper(
            label: 'Maximum age',
            value: _maxAge,
            min: 18,
            max: 100,
            onChanged: _changeMaxAge,
          ),
          NumberStepper(
            label: 'Maximum distance',
            value: _maxDistanceKm,
            min: 1,
            max: 500,
            step: 5,
            suffix: 'km',
            onChanged: (value) => setState(() => _maxDistanceKm = value),
          ),
          ToggleRow(
            title: 'Show my distance to others',
            value: _showDistance,
            onChanged: (value) => setState(() => _showDistance = value),
          ),
        ],
      ),
    );
  }
}
