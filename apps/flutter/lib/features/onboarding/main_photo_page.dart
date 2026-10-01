import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/toggle_row.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';
import 'photo_grid.dart';
import 'photo_guidelines_sheet.dart';

/// Main profile photo: a single required photo slot plus a screenshot
/// protection toggle. Saves photos locally (like PhotosPage) and
/// `screenshotProtectionEnabled` on advance.
class MainPhotoPage extends ConsumerStatefulWidget {
  const MainPhotoPage({super.key});

  @override
  ConsumerState<MainPhotoPage> createState() => _MainPhotoPageState();
}

class _MainPhotoPageState extends ConsumerState<MainPhotoPage> {
  bool _saving = false;
  bool _protected = false;
  bool _seeded = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final ok = await ref.read(onboardingControllerProvider).save(
        {'screenshotProtectionEnabled': _protected},
        stepNumber('main-photo'),
      );
      if (!mounted || !ok) return;
      context.push(pathForStep('phone-verify'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(onboardingControllerProvider);
    if (!_seeded) {
      _seeded = true;
      _protected = controller.draft.screenshotProtectionEnabled;
    }
    return OnboardingScreen(
      step: stepNumber('main-photo'),
      title: 'Add your profile photo',
      subtitle:
          'This will be displayed on your profile and will help you stand out from the crowd.',
      primaryLabel: 'Add photo',
      primaryDisabled: controller.draft.photos.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 160,
            child: PhotoGrid(
              photos: controller.draft.photos.take(1).toList(),
              onChanged: (photos) =>
                  ref.read(onboardingControllerProvider).setPhotos(photos),
              picker: ref.watch(mediaPickerProvider),
              media: ref.watch(mediaRepositoryProvider),
              slots: 1,
            ),
          ),
          const SizedBox(height: 16),
          ToggleRow(
            title: 'Screenshot protection',
            description:
                'Sanjari protects your privacy by blocking screenshots of your photos.',
            value: _protected,
            onChanged: (value) => setState(() => _protected = value),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => showPhotoGuidelinesSheet(context),
            child: const Text('Photo guidelines'),
          ),
        ],
      ),
    );
  }
}
