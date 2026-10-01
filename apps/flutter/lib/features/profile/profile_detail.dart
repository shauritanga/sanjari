import '../discover/candidate.dart';

// Shared profile-detail models. Pure Dart so parsing stays unit-testable.
// Ports the ProfileDetail family from
// apps/mobile/src/components/ProfileDetailView.tsx. Used by the self
// preview now and by public profiles later.
class DetailPhoto {
  const DetailPhoto({
    required this.id,
    required this.isPrimary,
    required this.url,
  });

  factory DetailPhoto.fromJson(Map<String, dynamic> json) {
    return DetailPhoto(
      id: json['id'] as String? ?? '',
      isPrimary: json['isPrimary'] == true,
      url: json['url'] as String? ?? '',
    );
  }

  final String id;
  final bool isPrimary;
  final String url;
}

class DetailInterest {
  const DetailInterest({required this.slug, required this.label});

  factory DetailInterest.fromJson(Map<String, dynamic> json) {
    return DetailInterest(
      slug: json['slug'] as String? ?? '',
      label: json['labelEn'] as String? ?? '',
    );
  }

  final String slug;
  final String label;
}

class DetailLanguage {
  const DetailLanguage({required this.code, required this.label});

  factory DetailLanguage.fromJson(Map<String, dynamic> json) {
    return DetailLanguage(
      code: json['code'] as String? ?? '',
      label: json['labelEn'] as String? ?? '',
    );
  }

  final String code;
  final String label;
}

class DetailPrompt {
  const DetailPrompt({required this.prompt, required this.answer});

  factory DetailPrompt.fromJson(Map<String, dynamic> json) {
    return DetailPrompt(
      prompt: json['prompt'] as String? ?? '',
      answer: json['answer'] as String? ?? '',
    );
  }

  final String prompt;
  final String answer;
}

class ProfileDetail {
  const ProfileDetail({
    required this.id,
    this.displayName,
    this.age,
    this.city,
    this.countryCode,
    this.countryName,
    this.occupationCategory,
    this.educationLevel,
    this.heightCm,
    this.memberSince,
    this.biography,
    this.verificationStatus = 'unverified',
    this.verification = const VerificationFlags(),
    this.distanceCategory = '',
    this.photos = const [],
    this.interests = const [],
    this.languages = const [],
    this.prompts = const [],
    this.voiceIntroUrl,
  });

  factory ProfileDetail.fromJson(Map<String, dynamic> json) {
    List<T> listOf<T>(
      dynamic value,
      T Function(Map<String, dynamic>) parse,
    ) {
      if (value is! List) return <T>[];
      return value.whereType<Map<String, dynamic>>().map(parse).toList();
    }

    return ProfileDetail(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String?,
      age: (json['age'] as num?)?.toInt(),
      city: json['city'] as String?,
      countryCode: json['countryCode'] as String?,
      countryName: json['countryName'] as String?,
      occupationCategory: json['occupationCategory'] as String?,
      educationLevel: json['educationLevel'] as String?,
      heightCm: (json['heightCm'] as num?)?.toInt(),
      memberSince: json['memberSince'] as String?,
      biography: json['biography'] as String?,
      verificationStatus: json['verificationStatus'] as String? ?? 'unverified',
      verification: VerificationFlags.fromJson(
        json['verification'] as Map<String, dynamic>?,
      ),
      distanceCategory: json['distanceCategory'] as String? ?? '',
      photos: listOf(json['photos'], DetailPhoto.fromJson),
      interests: listOf(json['interests'], DetailInterest.fromJson),
      languages: listOf(json['languages'], DetailLanguage.fromJson),
      prompts: listOf(json['prompts'], DetailPrompt.fromJson),
      voiceIntroUrl: json['voiceIntroUrl'] as String?,
    );
  }

  final String id;
  final String? displayName;
  final int? age;
  final String? city;
  final String? countryCode;
  final String? countryName;
  final String? occupationCategory;
  final String? educationLevel;
  final int? heightCm;
  final String? memberSince;
  final String? biography;
  final String verificationStatus;
  final VerificationFlags verification;
  final String distanceCategory;
  final List<DetailPhoto> photos;
  final List<DetailInterest> interests;
  final List<DetailLanguage> languages;
  final List<DetailPrompt> prompts;
  final String? voiceIntroUrl;

  String get safeName {
    final name = (displayName ?? '').trim();
    return name.isEmpty ? 'Sanjari member' : name;
  }

  /// Port of initialsFor(): up to two upper-cased initials, '?' when blank.
  String initials() {
    final name = (displayName ?? '').trim();
    if (name.isEmpty) return '?';
    return name
        .split(RegExp(r'\s+'))
        .take(2)
        .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
        .join();
  }
}
