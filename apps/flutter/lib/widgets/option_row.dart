import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

/// Full-width, single-line selectable row for a plain vertical option list.
/// Same look as the row used by CountryPage, shared across the onboarding
/// single-select list screens (profession, education, marital status,
/// smoking, drinking, children).
class OptionRow extends StatelessWidget {
  const OptionRow({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            width: 1.5,
            color: active ? scheme.primary : scheme.outline,
          ),
          color: active ? scheme.primaryContainer : scheme.surface,
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Checkbox-style row for a searchable multi-select list (nationality,
/// ethnicity), with a capped-selection "Confirm (N)" footer button.
class CheckRow extends StatelessWidget {
  const CheckRow({
    super.key,
    required this.label,
    required this.checked,
    required this.onTap,
  });

  final String label;
  final bool checked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: checked ? scheme.primary : null,
                ),
              ),
            ),
            Icon(
              checked
                  ? HugeIcons.strokeRoundedCheckmarkSquare01
                  : HugeIcons.strokeRoundedSquare,
              color: checked ? scheme.primary : scheme.outline,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}
