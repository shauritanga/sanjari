import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';
import 'photo_grid.dart';
import 'photo_guidelines_sheet.dart';

/// Photo upload step. Port of apps/mobile/app/onboarding/photos.tsx:
/// at least 3 photos gate Continue; the save itself only advances the
/// server step.
class PhotosPage extends ConsumerStatefulWidget {
  const PhotosPage({super.key});

  @override
  ConsumerState<PhotosPage> createState() => _PhotosPageState();
}

class _PhotosPageState extends ConsumerState<PhotosPage> {
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final ok = await ref.read(onboardingControllerProvider).save(
        const {},
        stepNumber('photos'),
      );
      if (!mounted || !ok) return;
      final next = nextStepPath('photos');
      if (next != null) context.push(next);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(onboardingControllerProvider);
    return OnboardingScreen(
      step: stepNumber('photos'),
      title: 'Add your profile photos',
      subtitle:
          'You need to upload at least 3 photos to continue completing your profile. You can change them later.',
      primaryLabel: 'Continue',
      primaryDisabled: controller.draft.photos.length < 3,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PhotoGrid(
            photos: controller.draft.photos,
            onChanged: (photos) =>
                ref.read(onboardingControllerProvider).setPhotos(photos),
            picker: ref.watch(mediaPickerProvider),
            media: ref.watch(mediaRepositoryProvider),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: () => showPhotoGuidelinesSheet(context),
              child: const Text('Photo guidelines'),
            ),
          ),
        ],
      ),
    );
  }
}
