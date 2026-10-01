import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

/// Photo guidelines bottom sheet shown from the photo steps. Uses plain
/// icon + caption cards rather than example photos, so there is no
/// religion- or appearance-specific imagery to get wrong.
Future<void> showPhotoGuidelinesSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _PhotoGuidelinesSheet(),
  );
}

class _PhotoGuidelinesSheet extends StatelessWidget {
  const _PhotoGuidelinesSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Use high-quality photos',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedUserCheck01,
                    label: 'Only show yourself',
                    good: true,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedFaceId,
                    label: 'Clear face',
                    good: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text(
              'Avoid these mistakes',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedUserGroup03,
                    label: 'Not just you',
                    good: false,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedViewOffSlash,
                    label: 'Face covered',
                    good: false,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Row(
              children: [
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedImageNotFound01,
                    label: 'Too far away',
                    good: false,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _GuidelineCard(
                    icon: HugeIcons.strokeRoundedMagicWand01,
                    label: 'No filters or AI images',
                    good: false,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}

class _GuidelineCard extends StatelessWidget {
  const _GuidelineCard({
    required this.icon,
    required this.label,
    required this.good,
  });

  final IconData icon;
  final String label;
  final bool good;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tint = good ? const Color(0xFF2E9D73) : scheme.error;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(
            good
                ? HugeIcons.strokeRoundedCheckmarkCircle01
                : HugeIcons.strokeRoundedCancelCircle,
            color: tint,
            size: 20,
          ),
          const SizedBox(height: 8),
          Icon(icon, size: 28, color: scheme.onSurfaceVariant),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
