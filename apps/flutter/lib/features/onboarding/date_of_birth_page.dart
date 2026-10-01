import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';
import 'pending_dob_provider.dart';

class DateOfBirthPage extends ConsumerStatefulWidget {
  const DateOfBirthPage({super.key});
  @override
  ConsumerState<DateOfBirthPage> createState() => _DateOfBirthPageState();
}

class _DateOfBirthPageState extends ConsumerState<DateOfBirthPage> {
  static const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
  ];
  late int day, month, year;
  DateTime? selected;
  @override
  void initState() {
    super.initState();
    final d = ref.read(pendingDateOfBirthProvider);
    day = d?.day ?? 30;
    month = (d?.month ?? 9) - 1;
    year = d?.year ?? DateTime.now().year - 18;
    selected = d;
  }

  DateTime? get date {
    final d = DateTime(year, month + 1, day);
    return d.month == month + 1 && d.day == day && !d.isAfter(DateTime.now())
        ? d
        : null;
  }

  int? age(DateTime? d) {
    if (d == null) return null;
    final n = DateTime.now();
    var a = n.year - d.year;
    if (n.month < d.month || (n.month == d.month && n.day < d.day)) a--;
    return a;
  }

  void changed() => setState(() => selected = date);
  @override
  Widget build(BuildContext context) {
    final years = age(selected);
    final valid = years != null && years >= 18;
    return OnboardingScreen(
        step: stepNumber('age'),
        title: 'When were you born?',
        footerNote: years != null ? "You're $years years old" : null,
        primaryLabel: 'Continue',
        primaryDisabled: !valid,
        onPrimary: () {
          if (!valid) return;
          ref.read(pendingDateOfBirthProvider.notifier).state = selected;
          final email = GoRouterState.of(context).uri.queryParameters['email'];
          if (email != null && email.isNotEmpty) {
            context.push(
                '/onboarding/intentions?email=${Uri.encodeComponent(email)}');
            return;
          }
          context.push(pathForStep('terms'));
        },
        child: Column(children: [
          const SizedBox(height: 8),
          Icon(Icons.calendar_month_outlined,
              size: 112, color: SanjariColors.coral),
          const SizedBox(height: 20),
          SizedBox(
              height: 190,
              child: Row(children: [
                Expanded(
                    child: picker(
                        day - 1, 31, (i) => '${i + 1}'.padLeft(2, '0'), (i) {
                  day = i + 1;
                  changed();
                })),
                Expanded(
                    child: picker(month, 12, (i) => months[i], (i) {
                  month = i;
                  changed();
                })),
                Expanded(
                    child: picker(year - 1900, DateTime.now().year - 1899,
                        (i) => '${1900 + i}', (i) {
                  year = 1900 + i;
                  changed();
                })),
              ])),
        ]));
  }

  Widget picker(int initial, int count, String Function(int) label,
          ValueChanged<int> onChanged) =>
      CupertinoPicker.builder(
          itemExtent: 44,
          diameterRatio: 3,
          squeeze: 1.15,
          magnification: 1.05,
          useMagnifier: true,
          scrollController: FixedExtentScrollController(
              initialItem: initial.clamp(0, count - 1)),
          onSelectedItemChanged: onChanged,
          itemBuilder: (c, i) => Center(
              child: Text(label(i), style: const TextStyle(fontSize: 18))),
          childCount: count);
}
