// Blocked profiles models. Pure Dart so parsing stays unit-testable.
// Ports the BlockedProfile interface from
// apps/mobile/app/settings/blocked.tsx.
class BlockedProfile {
  const BlockedProfile({
    required this.id,
    required this.blockedId,
    this.displayName,
    this.photoUrl,
    required this.createdAt,
  });

  factory BlockedProfile.fromJson(Map<String, dynamic> json) {
    return BlockedProfile(
      id: json['id'] as String? ?? '',
      blockedId: json['blockedId'] as String? ?? '',
      displayName: json['displayName'] as String?,
      photoUrl: json['photoUrl'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String id;
  final String blockedId;
  final String? displayName;
  final String? photoUrl;
  final String createdAt;

  String safeName(String fallback) {
    final name = (displayName ?? '').trim();
    return name.isEmpty ? fallback : name;
  }
}
