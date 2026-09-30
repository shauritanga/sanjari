import 'package:flutter/material.dart';

import '../l10n/locale_controller.dart';

/// Shown wherever a picked date of birth is under 18 — the email and
/// phone sign-up forms alike — so a rejection reads as an unmistakable
/// "adults only" message rather than blending into generic form errors.
Future<void> showUnder18Dialog(BuildContext context, AppLocale locale) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(tr(locale, 'under18Title')),
      content: Text(tr(locale, 'under18Message')),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(tr(locale, 'goBack')),
        ),
      ],
    ),
  );
}
