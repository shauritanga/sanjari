import '../onboarding/onboarding_models.dart';

/// Editable profile draft. Pure-Dart port of the Profile type plus the
/// editor state in apps/mobile/app/(tabs)/profile.tsx.
class VisibilityDraft {
  VisibilityDraft({
    this.hideAge = false,
    this.hideOnlineStatus = false,
    this.hideReadReceipts = false,
    this.hideCity = false,
    this.hideOccupation = false,
    this.hideEducation = false,
    this.hideHeight = false,
  });

  bool hideAge;
  bool hideOnlineStatus;
  bool hideReadReceipts;
  bool hideCity;
  bool hideOccupation;
  bool hideEducation;
  bool hideHeight;

  factory VisibilityDraft.fromJson(Map<String, dynamic>? json) {
    return VisibilityDraft(
      hideAge: json?['hideAge'] as bool? ?? false,
      hideOnlineStatus: json?['hideOnlineStatus'] as bool? ?? false,
      hideReadReceipts: json?['hideReadReceipts'] as bool? ?? false,
      hideCity: json?['hideCity'] as bool? ?? false,
      hideOccupation: json?['hideOccupation'] as bool? ?? false,
      hideEducation: json?['hideEducation'] as bool? ?? false,
      hideHeight: json?['hideHeight'] as bool? ?? false,
    );
  }
}

List<String> _strings(Object? value) {
  if (value is List) return value.whereType<String>().toList();
  return const [];
}

class EditableProfile {
  EditableProfile({
    this.displayName,
    this.pronouns,
    this.city,
    this.countryCode,
    this.cityId,
    this.cityName,
    this.biography,
    this.gender,
    List<String>? interestedIn,
    List<String>? relationshipIntentions,
    List<String>? interests,
    List<String>? languages,
    this.occupationCategory,
    this.educationLevel,
    this.heightCm,
    this.drinkingPreference,
    this.smokingPreference,
    this.exercisePreference,
    this.childrenPreference,
    this.culturalPreference,
    VisibilityDraft? visibility,
    List<OnboardingPhoto>? photos,
  })  : interestedIn = interestedIn ?? const [],
        relationshipIntentions = relationshipIntentions ?? const [],
        interests = interests ?? const [],
        languages = languages ?? const [],
        visibility = visibility ?? VisibilityDraft(),
        photos = photos ?? const [];

  String? displayName;
  String? pronouns;
  String? city;
  String? countryCode;
  String? cityId;
  String? cityName;
  String? biography;
  String? gender;
  List<String> interestedIn;
  List<String> relationshipIntentions;
  List<String> interests;
  List<String> languages;
  String? occupationCategory;
  String? educationLevel;
  int? heightCm;
  String? drinkingPreference;
  String? smokingPreference;
  String? exercisePreference;
  String? childrenPreference;
  String? culturalPreference;
  VisibilityDraft visibility;
  List<OnboardingPhoto> photos;

  factory EditableProfile.fromJson(Map<String, dynamic> json) {
    return EditableProfile(
      displayName: json['displayName'] as String?,
      pronouns: json['pronouns'] as String?,
      city: json['city'] as String?,
      countryCode: json['countryCode'] as String?,
      cityId: json['cityId'] as String?,
      cityName: json['cityName'] as String?,
      biography: json['biography'] as String?,
      gender: json['gender'] as String?,
      interestedIn: _strings(json['interestedIn']),
      relationshipIntentions: _strings(json['relationshipIntentions']),
      interests: _strings(json['interests']),
      languages: _strings(json['languages']),
      occupationCategory: json['occupationCategory'] as String?,
      educationLevel: json['educationLevel'] as String?,
      heightCm: (json['heightCm'] as num?)?.toInt(),
      drinkingPreference: json['drinkingPreference'] as String?,
      smokingPreference: json['smokingPreference'] as String?,
      exercisePreference: json['exercisePreference'] as String?,
      childrenPreference: json['childrenPreference'] as String?,
      culturalPreference: json['culturalPreference'] as String?,
      visibility: VisibilityDraft.fromJson(
        json['visibilitySettings'] as Map<String, dynamic>?,
      ),
      photos: (json['photos'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(OnboardingPhoto.fromJson)
              .toList() ??
          const [],
    );
  }

  /// PUT /onboarding body for the editor save. Ports the conditional
  /// spreads in save(): nulls are dropped (except the always-sent lists
  /// and visibility flags), empty country/city ids are dropped, and the
  /// step marker is 4.
  Map<String, dynamic> toSavePayload() {
    final visibility = this.visibility;
    return {
      'step': 4,
      if (displayName != null) 'displayName': displayName,
      if (pronouns != null) 'pronouns': pronouns,
      if (gender != null) 'gender': gender,
      'interestedIn': interestedIn,
      'relationshipIntentions': relationshipIntentions,
      'interests': interests,
      'languages': languages,
      if (biography != null) 'biography': biography,
      if (occupationCategory != null) 'occupationCategory': occupationCategory,
      if (educationLevel != null) 'educationLevel': educationLevel,
      if (city != null) 'city': city,
      if (countryCode != null && countryCode!.isNotEmpty)
        'countryCode': countryCode,
      if (cityId != null && cityId!.isNotEmpty) 'cityId': cityId,
      if (heightCm != null) 'heightCm': heightCm,
      if (drinkingPreference != null) 'drinkingPreference': drinkingPreference,
      if (smokingPreference != null) 'smokingPreference': smokingPreference,
      if (exercisePreference != null) 'exercisePreference': exercisePreference,
      if (childrenPreference != null) 'childrenPreference': childrenPreference,
      if (culturalPreference != null) 'culturalPreference': culturalPreference,
      'hideAge': visibility.hideAge,
      'hideOnlineStatus': visibility.hideOnlineStatus,
      'hideReadReceipts': visibility.hideReadReceipts,
      'hideCity': visibility.hideCity,
      'hideOccupation': visibility.hideOccupation,
      'hideEducation': visibility.hideEducation,
      'hideHeight': visibility.hideHeight,
    };
  }
}

/// Height field rule: digits only, max 3, empty means unset.
int? sanitizeHeightInput(String value) {
  final digits = value.replaceAll(RegExp(r'[^0-9]'), '');
  final trimmed = digits.length > 3 ? digits.substring(0, 3) : digits;
  if (trimmed.isEmpty) return null;
  return int.parse(trimmed);
}

/// Status pill copy from profile.tsx.
String profileStatusLabel(String? status) {
  switch (status) {
    case 'approved':
      return 'Verified';
    case 'submitted':
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Rejected — try again';
    default:
      return 'Not started';
  }
}

String publishStatusLabel(String status) {
  switch (status) {
    case 'published':
      return 'Live';
    case 'in_progress':
      return 'Draft';
    default:
      return 'Not started';
  }
}
