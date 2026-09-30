import 'package:flutter/material.dart';

import 'stepper_value.dart';

/// Labelled − / + stepper. Port of Stepper.tsx.
class NumberStepper extends StatelessWidget {
  const NumberStepper({
    super.key,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    this.step = 1,
    this.suffix,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final int step;
  final String? suffix;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
          _StepButton(
            semanticLabel: 'Decrease $label',
            icon: const Text('−', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            onTap: () {
              final next = stepperNext(value, -1, min: min, max: max, step: step);
              if (next != value) onChanged(next);
            },
          ),
          SizedBox(
            width: 64,
            child: Text(
              suffix == null ? '$value' : '$value $suffix',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: scheme.primary,
              ),
            ),
          ),
          _StepButton(
            semanticLabel: 'Increase $label',
            icon: Icon(Icons.add, color: scheme.onSurface, size: 14),
            onTap: () {
              final next = stepperNext(value, 1, min: min, max: max, step: step);
              if (next != value) onChanged(next);
            },
          ),
        ],
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.semanticLabel,
    required this.icon,
    required this.onTap,
  });

  final String semanticLabel;
  final Widget icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      label: semanticLabel,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: scheme.outline),
          ),
          child: icon,
        ),
      ),
    );
  }
}
