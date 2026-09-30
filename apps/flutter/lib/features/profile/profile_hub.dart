import 'package:intl/intl.dart';

// Profile hub models. Pure Dart (intl is pure Dart) so parsing and labels
// stay unit-testable. Ports the Profile/Onboarding/VerificationCase types
// and label helpers from apps/mobile/app/(tabs)/profile.tsx.
class HubPhoto {
  const HubPhoto({required this.id, this.url, this.isPrimary = false});

  factory HubPhoto.fromJson(Map<String, dynamic> json) {
    return HubPhoto(
      id: json['id'] as String? ?? '',
      url: json['url'] as String?,
      isPrimary: json['isPrimary'] == true,
    );
  }

  final String id;
  final String? url;
  final bool isPrimary;
}

class HubProfile {
  const HubProfile({
    this.displayName,
    this.city,
    this.photos = const [],
  });

  factory HubProfile.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const HubProfile();
    final photos = json['photos'];
    return HubProfile(
      displayName: json['displayName'] as String?,
      city: json['city'] as String?,
      photos: photos is List
          ? photos
              .whereType<Map<String, dynamic>>()
              .map(HubPhoto.fromJson)
              .toList()
          : const [],
    );
  }

  final String? displayName;
  final String? city;
  final List<HubPhoto> photos;

  String get safeName {
    final name = (displayName ?? '').trim();
    return name.isEmpty ? 'Your profile' : name;
  }

  String get initial {
    final name = (displayName ?? 'S').trim();
    if (name.isEmpty) return 'S';
    return name[0].toUpperCase();
  }

  HubPhoto? get primaryPhoto {
    if (photos.isEmpty) return null;
    return photos.firstWhere(
      (p) => p.isPrimary,
      orElse: () => photos.first,
    );
  }
}

class OnboardingState {
  const OnboardingState({
    this.completionScore = 0,
    this.onboardingStatus = 'not_started',
    this.age,
    this.memberSince,
    this.profile = const HubProfile(),
  });

  factory OnboardingState.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const OnboardingState();
    return OnboardingState(
      completionScore: (json['completionScore'] as num?)?.toInt() ?? 0,
      onboardingStatus:
          json['onboardingStatus'] as String? ?? 'not_started',
      age: (json['age'] as num?)?.toInt(),
      memberSince: json['memberSince'] as String?,
      profile: HubProfile.fromJson(
        json['profile'] as Map<String, dynamic>?,
      ),
    );
  }

  final int completionScore;
  final String onboardingStatus;
  final int? age;
  final String? memberSince;
  final HubProfile profile;
}

class VerificationCase {
  const VerificationCase({
    required this.id,
    required this.type,
    required this.status,
  });

  factory VerificationCase.fromJson(Map<String, dynamic> json) {
    return VerificationCase(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      status: json['status'] as String? ?? '',
    );
  }

  final String id;
  final String type;
  final String status;

  bool get approved => status == 'approved';
}

/// Latest case of a given verification type, mirroring
/// latestVerificationFor() in profile.tsx.
VerificationCase? latestVerificationFor(
  List<VerificationCase> cases,
  String type,
) {
  for (final item in cases) {
    if (item.type == type) return item;
  }
  return null;
}

/// Port of publishLabel(). Returns an i18n key — Expo hardcodes English,
/// the page resolves it so Swahili works too.
String publishStatusKey(String status) {
  switch (status) {
    case 'published':
      return 'liveStatus';
    case 'in_progress':
      return 'draftStatus';
    default:
      return 'notStarted';
  }
}

/// Port of memberSinceLabel(): "Member since June 2025", null when unknown.
String? memberSinceLabel(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  final date = DateTime.tryParse(iso);
  if (date == null) return null;
  return 'Member since ${DateFormat.yMMMM().format(date)}';
}
