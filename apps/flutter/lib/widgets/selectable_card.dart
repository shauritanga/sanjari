import 'package:flutter/material.dart';

/// Full-width option card with a selected check mark. Port of
/// SelectableCard.tsx.
class SelectableCard extends StatelessWidget {
  const SelectableCard({
    super.key,
    required this.title,
    this.description,
    this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String? description;
  final Widget? icon;
  final bool selected;
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
            color: selected ? scheme.primary : scheme.outline,
          ),
          color: selected ? scheme.primaryContainer : scheme.surface,
        ),
        child: Row(
          children: [
            if (icon != null) icon!,
            if (icon != null) const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
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
            if (selected)
              Icon(Icons.check_circle, color: scheme.primary, size: 22),
          ],
        ),
      ),
    );
  }
}
