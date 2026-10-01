import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sanjari/core/devices.dart';
import 'package:sanjari/features/onboarding/media_repository.dart';
import 'package:sanjari/features/onboarding/onboarding_models.dart';
import 'package:sanjari/features/onboarding/photo_grid.dart';

import 'mock_api.dart';

class _StubUploader implements BinaryUploader {
  @override
  Future<void> put(String url, List<int> bytes, String mimeType) async {}
}

class _StubPicker implements MediaPicker {
  _StubPicker({required this.galleryAllowed, this.picked});

  final bool galleryAllowed;
  final PickedMedia? picked;
  bool settingsOpened = false;
  bool pickAttempted = false;

  @override
  Future<bool> ensureGalleryAccess() async => galleryAllowed;

  @override
  Future<bool> ensureCameraAccess() async => true;

  @override
  Future<PickedMedia?> pickImage() async {
    pickAttempted = true;
    return picked;
  }

  @override
  Future<List<PickedMedia>> pickImages({int limit = 10}) async => [];

  @override
  Future<PickedMedia?> takePhoto({bool front = false}) async => null;

  @override
  Future<void> openSettings() async {
    settingsOpened = true;
  }
}

Widget _grid(_StubPicker picker) {
  final media = MediaRepository(mockApi((_) => {}), _StubUploader());
  return MaterialApp(
    home: Scaffold(
      body: PhotoGrid(
        photos: const <OnboardingPhoto>[],
        onChanged: (_) {},
        picker: picker,
        media: media,
      ),
    ),
  );
}

void main() {
  testWidgets('denied gallery access shows guidance with Open Settings',
      (tester) async {
    final picker = _StubPicker(galleryAllowed: false);
    await tester.pumpWidget(_grid(picker));

    await tester.tap(find.byIcon(Icons.add_a_photo_outlined).first);
    await tester.pumpAndSettle();

    // The user must be told what to do, not just that access failed.
    expect(find.text('Open Settings'), findsOneWidget);
    expect(find.text('Allow photo access'), findsOneWidget);

    await tester.tap(find.text('Open Settings'));
    await tester.pumpAndSettle();
    expect(picker.settingsOpened, isTrue);
    expect(picker.pickAttempted, isFalse);
  });

  testWidgets('cancelled pick shows no dialog', (tester) async {
    final picker = _StubPicker(galleryAllowed: true, picked: null);
    await tester.pumpWidget(_grid(picker));

    await tester.tap(find.byIcon(Icons.add_a_photo_outlined).first);
    await tester.pumpAndSettle();

    expect(find.text('Open Settings'), findsNothing);
    expect(find.text('Allow photo access'), findsNothing);
    expect(picker.pickAttempted, isTrue);
  });
}
