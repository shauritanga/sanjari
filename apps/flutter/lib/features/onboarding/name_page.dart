import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Display-name entry, minimum 2 non-blank characters. Port of
/// apps/mobile/app/onboarding/name.tsx.
class NamePage extends ConsumerStatefulWidget {
  const NamePage({super.key});

  @override
  ConsumerState<NamePage> createState() => _NamePageState();
}

class _NamePageState extends ConsumerState<NamePage> {
  final _name = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    _name.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'displayName': _name.text.trim()},
        stepNumber('name'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('gender'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(onboardingControllerProvider).draft;
    if (!_seeded) {
      _seeded = true;
      _name.text = draft.displayName;
      final email = GoRouterState.of(context).uri.queryParameters['email'];
      if (_name.text.isEmpty && email != null) {
        final local =
            email.split('@').first.replaceAll(RegExp(r'[._-]+'), ' ').trim();
        if (local.isNotEmpty) {
          _name.text = local
              .split(' ')
              .map((part) => part.isEmpty
                  ? part
                  : '${part[0].toUpperCase()}${part.substring(1)}')
              .join(' ');
        }
      }
    }
    return OnboardingScreen(
      step: stepNumber('name'),
      title: "What's your name?",
      subtitle: "This is how you'll appear to others.",
      primaryLabel: 'Continue',
      primaryDisabled: _name.text.trim().length < 2,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(children: [
        const SizedBox(height: 12),
        Icon(Icons.auto_stories_outlined,
            size: 112, color: SanjariColors.coral),
        const SizedBox(height: 28),
        TextField(
          controller: _name,
          maxLength: 60,
          textInputAction: TextInputAction.done,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) {
            if (_name.text.trim().length >= 2 && !_saving) _save();
          },
          decoration: InputDecoration(
            hintText: 'Your first name',
            counterText: '',
            suffixIcon: _name.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(_name.clear)),
          ),
        ),
        if (_error != null)
          Text(_error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
      ]),
    );
  }
}
