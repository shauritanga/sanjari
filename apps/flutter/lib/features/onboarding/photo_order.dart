import 'onboarding_models.dart';

/// Pure photo-list rules behind the photo grid. Ports movePhoto,
/// setPrimary, and the persistOrder renumbering in PhotoGrid.tsx:
/// positions follow the list order and the first photo is primary.
List<OnboardingPhoto> movePhotoInList(
  List<OnboardingPhoto> photos,
  String photoId,
  int direction,
) {
  final index = photos.indexWhere((photo) => photo.id == photoId);
  final target = index + direction;
  if (index < 0 || target < 0 || target >= photos.length) return photos;
  final next = List.of(photos);
  final moved = next.removeAt(index);
  next.insert(target, moved);
  return _renumbered(next);
}

List<OnboardingPhoto> primaryFirst(
  List<OnboardingPhoto> photos,
  String photoId,
) {
  final photo =
      photos.where((item) => item.id == photoId).toList();
  if (photo.isEmpty || photos.first.id == photoId) return photos;
  final rest = photos.where((item) => item.id != photoId).toList();
  return _renumbered([photo.first, ...rest]);
}

List<OnboardingPhoto> _renumbered(List<OnboardingPhoto> photos) {
  return [
    for (var i = 0; i < photos.length; i++)
      OnboardingPhoto(
        id: photos[i].id,
        position: i,
        isPrimary: i == 0,
        moderationStatus: photos[i].moderationStatus,
        url: photos[i].url,
      ),
  ];
}
