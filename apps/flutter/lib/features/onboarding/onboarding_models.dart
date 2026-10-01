/// Onboarding draft state. Pure-Dart port of the zustand store shape in
/// apps/mobile/src/store/onboarding.ts: server snapshot (hydrate) plus the
/// local-only flags each step toggles before saving.
class DiscoveryPreferenceDraft {
  DiscoveryPreferenceDraft({
    this.minAge = 18,
    this.maxAge = 80,
    this.maxDistanceKm = 50,
    List<String>? genders,
    List<String>? intentions,
    this.showDistance = true,
  })  : genders = genders ?? const [],
        intentions = intentions ?? const [];

  final int minAge;
  final int maxAge;
  final int maxDistanceKm;
  final List<String> genders;
  final List<String> intentions;
  final bool showDistance;

  factory DiscoveryPreferenceDraft.fromJson(Map<String, dynamic> json) {
    return DiscoveryPreferenceDraft(
      minAge: (json['minAge'] as num?)?.toInt() ?? 18,
      maxAge: (json['maxAge'] as num?)?.toInt() ?? 80,
      maxDistanceKm: (json['maxDistanceKm'] as num?)?.toInt() ?? 50,
      genders:
          (json['genders'] as List?)?.whereType<String>().toList() ?? const [],
      intentions: (json['intentions'] as List?)?.whereType<String>().toList() ??
          const [],
      showDistance: json['showDistance'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'minAge': minAge,
        'maxAge': maxAge,
        'maxDistanceKm': maxDistanceKm,
        'genders': genders,
        'intentions': intentions,
        'showDistance': showDistance,
      };

  DiscoveryPreferenceDraft merge(Map<String, dynamic> patch) {
    return DiscoveryPreferenceDraft.fromJson({...toJson(), ...patch});
  }
}

class PromptAnswerDraft {
  PromptAnswerDraft({required this.promptId, required this.answer});

  final String promptId;
  final String answer;

  factory PromptAnswerDraft.fromJson(Map<String, dynamic> json) {
    return PromptAnswerDraft(
      promptId: json['promptId'] as String? ?? '',
      answer: json['answer'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'promptId': promptId, 'answer': answer};
}

class OnboardingPhoto {
  OnboardingPhoto({
    required this.id,
    required this.position,
    required this.isPrimary,
    required this.moderationStatus,
    this.url,
  });

  final String id;
  final int position;
  final bool isPrimary;
  final String moderationStatus;
  final String? url;

  factory OnboardingPhoto.fromJson(Map<String, dynamic> json) {
    return OnboardingPhoto(
      id: json['id'] as String? ?? '',
      position: (json['position'] as num?)?.toInt() ?? 0,
      isPrimary: json['isPrimary'] as bool? ?? false,
      moderationStatus: json['moderationStatus'] as String? ?? '',
      url: json['url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'position': position,
        'isPrimary': isPrimary,
        'moderationStatus': moderationStatus,
        if (url != null) 'url': url,
      };
}

List<String> _stringList(Object? value) {
  if (value is List) return value.whereType<String>().toList();
  return const [];
}

/// Mutable-in-spirit snapshot of the onboarding flow. Field defaults mirror
/// the store's initial state; [OnboardingDraft.hydrated] parses the
/// GET /onboarding envelope with the same `??` fallbacks as hydrate().
class OnboardingDraft {
  OnboardingDraft({
    this.hydrated = false,
    this.onboardingStatus = 'not_started',
    this.onboardingStep = 1,
    this.completionScore = 0,
    this.age,
    this.displayName = '',
    this.gender = '',
    List<String>? interestedIn,
    List<String>? relationshipIntentions,
    List<String>? nationalities,
    List<String>? ethnicities,
    this.maritalStatus = '',
    List<String>? personalityTraits,
    this.screenshotProtectionEnabled = false,
    this.biography = '',
    this.city = '',
    this.cityId,
    this.cityName = '',
    this.countryCode = '',
    List<String>? interests,
    List<String>? languages,
    this.hideAge = false,
    this.hideOnlineStatus = false,
    this.hideReadReceipts = false,
    List<OnboardingPhoto>? photos,
    List<PromptAnswerDraft>? promptAnswers,
    DiscoveryPreferenceDraft? discoveryPreference,
    this.approximateLocationSet = false,
    this.notificationsEnabled = false,
    this.voiceIntroKey,
  })  : interestedIn = interestedIn ?? const [],
        relationshipIntentions = relationshipIntentions ?? const [],
        nationalities = nationalities ?? const [],
        ethnicities = ethnicities ?? const [],
        personalityTraits = personalityTraits ?? const [],
        interests = interests ?? const [],
        languages = languages ?? const [],
        photos = photos ?? const [],
        promptAnswers = promptAnswers ?? const [],
        discoveryPreference = discoveryPreference ?? DiscoveryPreferenceDraft();

  bool hydrated;
  String onboardingStatus;
  int onboardingStep;
  int completionScore;
  int? age;
  String displayName;
  String gender;
  List<String> interestedIn;
  List<String> relationshipIntentions;
  List<String> nationalities;
  List<String> ethnicities;
  String maritalStatus;
  List<String> personalityTraits;
  bool screenshotProtectionEnabled;
  String biography;
  String city;
  String? cityId;
  String cityName;
  String countryCode;
  List<String> interests;
  List<String> languages;
  bool hideAge;
  bool hideOnlineStatus;
  bool hideReadReceipts;
  List<OnboardingPhoto> photos;
  List<PromptAnswerDraft> promptAnswers;
  DiscoveryPreferenceDraft discoveryPreference;
  bool approximateLocationSet;
  bool notificationsEnabled;
  String? voiceIntroKey;

  factory OnboardingDraft.hydrated(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>? ?? const {};
    final visibility = profile['visibilitySettings'] as Map<String, dynamic>?;
    return OnboardingDraft(
      hydrated: true,
      onboardingStatus: json['onboardingStatus'] as String? ?? 'not_started',
      onboardingStep: (json['onboardingStep'] as num?)?.toInt() ?? 1,
      completionScore: (json['completionScore'] as num?)?.toInt() ?? 0,
      age: (json['age'] as num?)?.toInt(),
      displayName: profile['displayName'] as String? ?? '',
      gender: profile['gender'] as String? ?? '',
      interestedIn: _stringList(profile['interestedIn']),
      relationshipIntentions: _stringList(profile['relationshipIntentions']),
      nationalities: _stringList(profile['nationalities']),
      ethnicities: _stringList(profile['ethnicities']),
      maritalStatus: profile['maritalStatus'] as String? ?? '',
      personalityTraits: _stringList(profile['personalityTraits']),
      screenshotProtectionEnabled:
          profile['screenshotProtectionEnabled'] as bool? ?? false,
      biography: profile['biography'] as String? ?? '',
      city: profile['city'] as String? ?? '',
      cityId: profile['cityId'] as String?,
      cityName: profile['cityName'] as String? ?? '',
      countryCode: profile['countryCode'] as String? ?? '',
      interests: _stringList(profile['interests']),
      languages: _stringList(profile['languages']),
      voiceIntroKey: profile['voiceIntroKey'] as String?,
      hideAge: visibility?['hideAge'] as bool? ?? false,
      hideOnlineStatus: visibility?['hideOnlineStatus'] as bool? ?? false,
      hideReadReceipts: visibility?['hideReadReceipts'] as bool? ?? false,
      photos: (profile['photos'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(OnboardingPhoto.fromJson)
              .toList() ??
          const [],
    );
  }

  /// Applies a save response ({completionScore, onboardingStep,
  /// onboardingStatus}) plus the saved fields, mirroring saveOnboarding's
  /// set() merge: response values win, fields overwrite, cityId keeps its
  /// current value unless the fields carry one.
  void applySave(Map<String, dynamic> fields, Map<String, dynamic> result) {
    if (fields['displayName'] is String) {
      displayName = fields['displayName'] as String;
    }
    if (fields['gender'] is String) gender = fields['gender'] as String;
    if (fields['interestedIn'] is List) {
      interestedIn = _stringList(fields['interestedIn']);
    }
    if (fields['relationshipIntentions'] is List) {
      relationshipIntentions = _stringList(fields['relationshipIntentions']);
    }
    if (fields['nationalities'] is List) {
      nationalities = _stringList(fields['nationalities']);
    }
    if (fields['ethnicities'] is List) {
      ethnicities = _stringList(fields['ethnicities']);
    }
    if (fields['maritalStatus'] is String) {
      maritalStatus = fields['maritalStatus'] as String;
    }
    if (fields['personalityTraits'] is List) {
      personalityTraits = _stringList(fields['personalityTraits']);
    }
    if (fields['screenshotProtectionEnabled'] is bool) {
      screenshotProtectionEnabled = fields['screenshotProtectionEnabled'] as bool;
    }
    if (fields['biography'] is String) {
      biography = fields['biography'] as String;
    }
    if (fields['city'] is String) city = fields['city'] as String;
    if (fields['cityId'] is String) cityId = fields['cityId'] as String;
    if (fields['countryCode'] is String) {
      countryCode = fields['countryCode'] as String;
    }
    if (fields['interests'] is List) {
      interests = _stringList(fields['interests']);
    }
    if (fields['languages'] is List) {
      languages = _stringList(fields['languages']);
    }
    if (fields['hideAge'] is bool) hideAge = fields['hideAge'] as bool;
    if (fields['hideOnlineStatus'] is bool) {
      hideOnlineStatus = fields['hideOnlineStatus'] as bool;
    }
    if (fields['hideReadReceipts'] is bool) {
      hideReadReceipts = fields['hideReadReceipts'] as bool;
    }
    if (result['completionScore'] is num) {
      completionScore = (result['completionScore'] as num).toInt();
    }
    if (result['onboardingStep'] is num) {
      onboardingStep = (result['onboardingStep'] as num).toInt();
    }
    if (result['onboardingStatus'] is String) {
      onboardingStatus = result['onboardingStatus'] as String;
    }
  }
}
