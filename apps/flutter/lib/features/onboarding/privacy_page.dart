import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/toggle_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Visibility toggles. Port of apps/mobile/app/onboarding/privacy.tsx:
/// one `{hideAge, hideOnlineStatus, hideReadReceipts}` save, then the
/// verification step.
class PrivacyPage extends ConsumerStatefulWidget {
  const PrivacyPage({super.key});

  @override
  ConsumerState<PrivacyPage> createState() => _PrivacyPageState();
}

class _PrivacyPageState extends ConsumerState<PrivacyPage> {
  bool _hideAge = false;
  bool _hideOnlineStatus = false;
  bool _hideReadReceipts = false;
  bool _saving = false;
  String? _error;
  bool _seeded = false;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {
          'hideAge': _hideAge,
          'hideOnlineStatus': _hideOnlineStatus,
          'hideReadReceipts': _hideReadReceipts,
        },
        stepNumber('privacy'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('verification'));
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
      _hideAge = draft.hideAge;
      _hideOnlineStatus = draft.hideOnlineStatus;
      _hideReadReceipts = draft.hideReadReceipts;
    }
    return OnboardingScreen(
      step: stepNumber('privacy'),
      title: 'Privacy controls',
      subtitle: 'Fine-tune what others can see.',
      primaryLabel: 'Continue',
      primaryBusy: _saving,
      onPrimary: _save,
      footerNote: _error,
      child: Column(
        children: [
          ToggleRow(
            title: 'Hide my age',
            description: 'Only your age range will show',
            value: _hideAge,
            onChanged: (value) => setState(() => _hideAge = value),
          ),
          ToggleRow(
            title: 'Hide online status',
            description: "Others won't see when you're active",
            value: _hideOnlineStatus,
            onChanged: (value) => setState(() => _hideOnlineStatus = value),
          ),
          ToggleRow(
            title: 'Hide read receipts',
            description: "Others won't know when you've read their messages",
            value: _hideReadReceipts,
            onChanged: (value) => setState(() => _hideReadReceipts = value),
          ),
        ],
      ),
    );
  }
}
