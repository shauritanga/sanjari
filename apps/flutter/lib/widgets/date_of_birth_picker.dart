import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../core/age.dart';
import '../l10n/locale_controller.dart';
import 'under18_dialog.dart';

/// Shared birthday picker for onboarding and registration.
Future<void> pickDateOfBirth(
  BuildContext context,
  AppLocale locale, {
  DateTime? initialDateTime,
  required ValueChanged<DateTime> onSelected,
}) async {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final earliest = DateTime(now.year - 100);
  var selected = initialDateTime ?? DateTime(now.year - 25, now.month, now.day);
  selected = DateTime(selected.year, selected.month, selected.day);
  if (selected.isBefore(earliest)) selected = earliest;
  if (selected.isAfter(today)) selected = today;

  final date = await showModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) {
      final labels = MaterialLocalizations.of(sheetContext);
      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(tr(locale, 'dateOfBirth'),
                  style: Theme.of(sheetContext).textTheme.titleLarge),
              SizedBox(
                height: 220,
                child: CupertinoDatePicker(
                  mode: CupertinoDatePickerMode.date,
                  initialDateTime: selected,
                  minimumDate: earliest,
                  maximumDate: today,
                  minimumYear: earliest.year,
                  maximumYear: today.year,
                  onDateTimeChanged: (value) => selected = value,
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(sheetContext).pop(),
                    child: Text(labels.cancelButtonLabel),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    style:
                        FilledButton.styleFrom(minimumSize: const Size(88, 52)),
                    key: const ValueKey('confirm-date-of-birth'),
                    onPressed: () => Navigator.of(sheetContext).pop(selected),
                    child: Text(labels.okButtonLabel),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
  if (date == null || !context.mounted) return;
  if (calculateAgeOn(date, DateTime.now()) < minimumAge) {
    await showUnder18Dialog(context, locale);
    return;
  }
  onSelected(date);
}
