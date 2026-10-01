// Discovery domain models. Pure Dart (no Flutter imports) so parsing and
// formatting stay unit-testable. Ports the Candidate/LikeResult interfaces
// from apps/mobile/app/(tabs)/discover.tsx and likes.tsx.
class VerificationFlags {
  const VerificationFlags({
    this.photoVerified = false,
    this.ageVerified = false,
    this.idVerified = false,
  });

  factory VerificationFlags.fromJson(Map<String, dynamic>? json) {
    return VerificationFlags(
      photoVerified: json?['photoVerified'] == true,
      ageVerified: json?['ageVerified'] == true,
      idVerified: json?['idVerified'] == true,
    );
  }

  final bool photoVerified;
  final bool ageVerified;
  final bool idVerified;

  bool get anyVerified => photoVerified || ageVerified || idVerified;
}

class CandidatePhoto {
  const CandidatePhoto({required this.id, required this.url});

  factory CandidatePhoto.fromJson(Map<String, dynamic> json) {
    return CandidatePhoto(
      id: json['id'] as String? ?? '',
      url: json['url'] as String? ?? '',
    );
  }

  final String id;
  final String url;
}

class Candidate {
  const Candidate({
    required this.id,
    this.displayName,
    this.age,
    this.city,
    this.countryCode,
    this.countryName,
    this.occupationCategory,
    this.distanceCategory = '',
    this.verificationStatus = 'unverified',
    this.verification = const VerificationFlags(),
    this.primaryPhoto,
  });

  factory Candidate.fromJson(Map<String, dynamic> json) {
    final photo = json['primaryPhoto'];
    return Candidate(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String?,
      age: (json['age'] as num?)?.toInt(),
      city: json['city'] as String?,
      countryCode: json['countryCode'] as String?,
      countryName: json['countryName'] as String?,
      occupationCategory: json['occupationCategory'] as String?,
      distanceCategory: json['distanceCategory'] as String? ?? '',
      verificationStatus: json['verificationStatus'] as String? ?? 'unverified',
      verification: VerificationFlags.fromJson(
        json['verification'] as Map<String, dynamic>?,
      ),
      primaryPhoto:
          photo is Map<String, dynamic> ? CandidatePhoto.fromJson(photo) : null,
    );
  }

  final String id;
  final String? displayName;
  final int? age;
  final String? city;
  final String? countryCode;
  final String? countryName;
  final String? occupationCategory;
  final String distanceCategory;
  final String verificationStatus;
  final VerificationFlags verification;
  final CandidatePhoto? primaryPhoto;

  String get safeName {
    final name = (displayName ?? '').trim();
    return name.isEmpty ? 'Sanjari member' : name;
  }
}

/// Port of distanceLabel() in discover.tsx.
String distanceLabel(String category) {
  switch (category) {
    case 'not_shared':
      return 'Location private';
    case 'nearby':
      return 'Nearby';
    case 'within_25km':
      return 'Within 25 km';
    case 'within_50km':
      return 'Within 50 km';
    case 'farther_away':
      return 'Farther away';
    default:
      return 'Distance unknown';
  }
}

class MatchedUser {
  const MatchedUser({required this.id, this.displayName, this.primaryPhoto});

  factory MatchedUser.fromJson(Map<String, dynamic> json) {
    final photo = json['primaryPhoto'];
    return MatchedUser(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String?,
      primaryPhoto:
          photo is Map<String, dynamic> ? CandidatePhoto.fromJson(photo) : null,
    );
  }

  final String id;
  final String? displayName;
  final CandidatePhoto? primaryPhoto;
}

class LikeResult {
  const LikeResult({
    required this.liked,
    required this.matched,
    this.matchId,
    this.conversationId,
    required this.likeId,
    this.matchedUser,
  });

  factory LikeResult.fromJson(Map<String, dynamic> json) {
    final user = json['matchedUser'];
    return LikeResult(
      liked: json['liked'] == true,
      matched: json['matched'] == true,
      matchId: json['matchId'] as String?,
      conversationId: json['conversationId'] as String?,
      likeId: json['likeId'] as String? ?? '',
      matchedUser:
          user is Map<String, dynamic> ? MatchedUser.fromJson(user) : null,
    );
  }

  final bool liked;
  final bool matched;
  final String? matchId;
  final String? conversationId;
  final String likeId;
  final MatchedUser? matchedUser;
}
