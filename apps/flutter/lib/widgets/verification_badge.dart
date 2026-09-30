import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/locale_controller.dart';

/// Verified-badge blue from VerificationBadge.tsx.
const verificationBlue = Color(0xFF2F6FED);

/// Display tone: 'overlay' sits on a photo (light unverified icons),
/// 'surface' sits on cards (gray unverified icons).
enum VerificationTone { overlay, surface }

/// Tappable badge shown next to a name when any check passed; opens the
/// verification checklist dialog. Ports VerificationBadge.tsx (renders
/// nothing when no check passed).
class VerificationBadge extends ConsumerWidget {
  const VerificationBadge({
    super.key,
    required this.displayName,
    required this.photoVerified,
    required this.ageVerified,
    required this.idVerified,
    this.tone = VerificationTone.surface,
    this.size = 18,
  });

  final String displayName;
  final bool photoVerified;
  final bool ageVerified;
  final bool idVerified;
  final VerificationTone tone;
  final double size;

  bool get anyVerified => photoVerified || ageVerified || idVerified;
  bool get fullyVerified =>
      photoVerified && ageVerified && idVerified;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!anyVerified) return const SizedBox.shrink();
    final locale = ref.watch(localeProvider).value;
    return IconButton(
      tooltip: tr(locale, 'viewBadges'),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
      onPressed: () => showDialog<void>(
        context: context,
        builder: (context) => _BadgesDialog(
          displayName: displayName,
          photoVerified: photoVerified,
          ageVerified: ageVerified,
          idVerified: idVerified,
          tone: tone,
        ),
      ),
      icon: fullyVerified
          ? SizedBox(
              width: size * 1.45,
              height: size,
              child: Stack(
                children: [
                  Icon(
                    Icons.verified,
                    color: tone == VerificationTone.overlay
                        ? Colors.white
                        : Theme.of(context).colorScheme.surface,
                    size: size,
                  ),
                  Positioned(
                    left: size * 0.45,
                    child: Icon(
                      Icons.verified,
                      color: verificationBlue,
                      size: size,
                    ),
                  ),
                ],
              ),
            )
          : Icon(
              Icons.verified,
              color: verificationBlue,
              size: size,
            ),
    );
  }
}

class _BadgeRow {
  const _BadgeRow({
    required this.titleKey,
    required this.verifiedKey,
    required this.unverifiedKey,
    required this.verified,
  });

  final String titleKey;
  final String verifiedKey;
  final String unverifiedKey;
  final bool verified;
}

class _BadgesDialog extends ConsumerWidget {
  const _BadgesDialog({
    required this.displayName,
    required this.photoVerified,
    required this.ageVerified,
    required this.idVerified,
    required this.tone,
  });

  final String displayName;
  final bool photoVerified;
  final bool ageVerified;
  final bool idVerified;
  final VerificationTone tone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider).value;
    final name =
        displayName.trim().isEmpty ? 'This member' : displayName.trim();
    final rows = [
      _BadgeRow(
        titleKey: 'photoVerification',
        verifiedKey: 'photoVerifiedCopy',
        unverifiedKey: 'photoUnverifiedCopy',
        verified: photoVerified,
      ),
      _BadgeRow(
        titleKey: 'ageVerification',
        verifiedKey: 'ageVerifiedCopy',
        unverifiedKey: 'ageUnverifiedCopy',
        verified: ageVerified,
      ),
      _BadgeRow(
        titleKey: 'idVerification',
        verifiedKey: 'idVerifiedCopy',
        unverifiedKey: 'idUnverifiedCopy',
        verified: idVerified,
      ),
    ];
    return Dialog(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              tr(locale, 'verificationBadges'),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16),
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.verified,
                      color: row.verified
                          ? verificationBlue
                          : tone == VerificationTone.overlay
                              ? Colors.white70
                              : Theme.of(context).colorScheme.outline,
                      size: 26,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr(locale, row.titleKey),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            tr(
                              locale,
                              row.verified
                                  ? row.verifiedKey
                                  : row.unverifiedKey,
                            ).replaceAll('{name}', name),
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(tr(locale, 'okGotIt')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
