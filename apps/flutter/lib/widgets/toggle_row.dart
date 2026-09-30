import 'package:flutter/material.dart';

/// Title/description row with a trailing switch. Port of ToggleRow.tsx.
class ToggleRow extends StatelessWidget {
  const ToggleRow({
    super.key,
    required this.title,
    this.description,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String? description;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (description != null)
                  Text(
                    description!,
                    style: TextStyle(
                      fontSize: 13,
                      height: 18 / 13,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: scheme.primary,
            activeTrackColor: scheme.primary,
            inactiveTrackColor: scheme.outline,
          ),
        ],
      ),
    );
  }
}
