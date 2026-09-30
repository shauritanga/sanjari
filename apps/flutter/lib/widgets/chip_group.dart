import 'package:flutter/material.dart';

import 'chip_selection.dart';

/// Wrap of pill toggle chips. Port of ChipGroup.tsx: multi-select by
/// default (optional [max] cap, e.g. intentions allow up to 3), or
/// single-toggle when [multiple] is false.
class ChipGroup extends StatelessWidget {
  const ChipGroup({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.multiple = true,
    this.max,
  });

  final List<ChipOption> options;
  final List<String> selected;
  final ValueChanged<List<String>> onChanged;
  final bool multiple;
  final int? max;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final option in options)
          _Chip(
            label: option.label,
            active: selected.contains(option.value),
            onTap: () => onChanged(
              toggleChipSelection(
                selected,
                option.value,
                multiple: multiple,
                max: max,
              ),
            ),
            scheme: scheme,
          ),
      ],
    );
  }
}

/// Pill option label. Mirrors the ChipOption interface in ChipGroup.tsx.
class ChipOption {
  const ChipOption({required this.value, required this.label});

  final String value;
  final String label;
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.active,
    required this.onTap,
    required this.scheme,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? scheme.primary : scheme.outline,
          ),
          color: active ? scheme.primary : scheme.surface,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: active ? scheme.onPrimary : scheme.onSurface,
          ),
        ),
      ),
    );
  }
}
