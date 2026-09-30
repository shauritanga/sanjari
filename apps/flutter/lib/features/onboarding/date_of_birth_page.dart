import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/locale_controller.dart';
import '../../widgets/date_of_birth_picker.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';
import 'pending_dob_provider.dart';

/// Date-of-birth capture, shown right after the /onboarding/age "I'm 18 or
/// older" confirmation. An under-18 pick is rejected here, immediately,
/// with an unmistakable "adults only" message — before the user can go
/// any further. Not part of the numbered onboardingSteps catalogue (it
/// has no server-side counterpart, matching the original app), so it
/// reuses the 'age' step's progress position. The picked date carries
/// forward to the email/phone sign-up screens via
/// [pendingDateOfBirthProvider] so it isn't asked for twice.
class DateOfBirthPage extends ConsumerStatefulWidget {
  const DateOfBirthPage({super.key});

  @override
  ConsumerState<DateOfBirthPage> createState() => _DateOfBirthPageState();
}

class _DateOfBirthPageState extends ConsumerState<DateOfBirthPage> {
  DateTime? _dateOfBirth;

  @override
  void initState() {
    super.initState();
    _dateOfBirth = ref.read(pendingDateOfBirthProvider);
  }

  void _pickDate() {
    pickDateOfBirth(
      context,
      ref.read(localeProvider).value,
      initialDateTime: _dateOfBirth,
      onSelected: (date) => setState(() => _dateOfBirth = date),
    );
  }

  void _continue() {
    final dob = _dateOfBirth;
    if (dob == null) return;
    ref.read(pendingDateOfBirthProvider.notifier).state = dob;
    context.push(pathForStep('terms'));
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final dob = _dateOfBirth;
    return OnboardingScreen(
      step: stepNumber('age'),
      title: 'Confirm your date of birth',
      subtitle:
          "It's verified again when you create your account, and is "
          'never shown on your public profile — only your age.',
      primaryLabel: tr(locale, 'continueAction'),
      primaryDisabled: dob == null,
      onPrimary: _continue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            tr(locale, 'dateOfBirth'),
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 6),
          OutlinedButton.icon(
            onPressed: _pickDate,
            style: OutlinedButton.styleFrom(
              alignment: Alignment.centerLeft,
              minimumSize: const Size.fromHeight(52),
            ),
            icon: const Icon(Icons.calendar_today_outlined, size: 18),
            label: Text(
              dob == null
                  ? tr(locale, 'selectDateOfBirth')
                  : '${dob.year}-${dob.month.toString().padLeft(2, '0')}-${dob.day.toString().padLeft(2, '0')}',
            ),
          ),
        ],
      ),
    );
  }
}
