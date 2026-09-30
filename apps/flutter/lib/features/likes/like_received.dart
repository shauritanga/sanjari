// Incoming like model. Pure Dart. Ports the LikeReceived interface from
// apps/mobile/app/(tabs)/likes.tsx.
import '../discover/candidate.dart';

class LikeReceived {
  const LikeReceived({
    required this.likeId,
    required this.userId,
    this.comment,
    this.priority = false,
    required this.createdAt,
    this.displayName,
    this.city,
    this.verificationStatus = 'unverified',
    this.primaryPhoto,
  });

  factory LikeReceived.fromJson(Map<String, dynamic> json) {
    final photo = json['primaryPhoto'];
    return LikeReceived(
      likeId: json['likeId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      comment: json['comment'] as String?,
      priority: json['priority'] == true,
      createdAt: json['createdAt'] as String? ?? '',
      displayName: json['displayName'] as String?,
      city: json['city'] as String?,
      verificationStatus:
          json['verificationStatus'] as String? ?? 'unverified',
      primaryPhoto: photo is Map<String, dynamic>
          ? CandidatePhoto.fromJson(photo)
          : null,
    );
  }

  final String likeId;
  final String userId;
  final String? comment;
  final bool priority;
  final String createdAt;
  final String? displayName;
  final String? city;
  final String verificationStatus;
  final CandidatePhoto? primaryPhoto;

  String get safeName {
    final name = (displayName ?? '').trim();
    return name.isEmpty ? 'Sanjari member' : name;
  }

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
