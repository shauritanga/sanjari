import 'package:flutter/material.dart';

/// Guidance dialog for a denied photo-library gate. A bare snackbar left
/// users stuck ("allow photo library access" with no next step), so this
/// spells out the recovery path and deep-links to the OS app settings.
Future<void> showPhotoAccessDialog({
  required BuildContext context,
  required Future<void> Function() onOpenSettings,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Allow photo access'),
      content: const Text(
        'Sanjari needs access to your photos to continue.\n\n'
        '1. Tap Open Settings below\n'
        '2. Open Permissions (or Photos)\n'
        '3. Allow photo access\n'
        '4. Come back here and try again',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('Not now'),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(dialogContext).pop();
            onOpenSettings();
          },
          child: const Text('Open Settings'),
        ),
      ],
    ),
  );
}
