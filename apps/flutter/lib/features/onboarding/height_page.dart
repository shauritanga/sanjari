import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

const _minHeightCm = 122;
const _maxHeightCm = 220;

String _feetInches(int cm) {
  final totalInches = (cm / 2.54).round();
  final feet = totalInches ~/ 12;
  final inches = totalInches % 12;
  return "$feet' $inches\"";
}

/// Height picker (122cm-220cm), each row showing both cm and ft/in. Saves
/// `heightCm`.
class HeightPage extends ConsumerStatefulWidget {
  const HeightPage({super.key});

  @override
  ConsumerState<HeightPage> createState() => _HeightPageState();
}

class _HeightPageState extends ConsumerState<HeightPage> {
  late int _heightCm;
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'heightCm': _heightCm},
        stepNumber('height'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('marital-status'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (!_seeded) {
      _seeded = true;
      _heightCm = 170;
    }
    return OnboardingScreen(
      step: stepNumber('height'),
      title: 'How tall are you?',
      primaryLabel: 'Continue',
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        children: [
          SizedBox(
            height: 260,
            child: CupertinoPicker.builder(
              itemExtent: 44,
              diameterRatio: 3,
              squeeze: 1.15,
              magnification: 1.05,
              useMagnifier: true,
              scrollController: FixedExtentScrollController(
                initialItem: _heightCm - _minHeightCm,
              ),
              onSelectedItemChanged: (index) =>
                  setState(() => _heightCm = _minHeightCm + index),
              itemBuilder: (context, index) {
                final cm = _minHeightCm + index;
                return Center(
                  child: Text(
                    '${cm}cm  ·  ${_feetInches(cm)}',
                    style: const TextStyle(fontSize: 18),
                  ),
                );
              },
              childCount: _maxHeightCm - _minHeightCm + 1,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: scheme.error)),
          ],
        ],
      ),
    );
  }
}
