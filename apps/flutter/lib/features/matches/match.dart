// Match model. Pure Dart. Ports the Match interface and NEW_MATCH_WINDOW_MS
// from apps/mobile/app/(tabs)/matches.tsx.
class MatchProfile {
  const MatchProfile({this.displayName, this.city});

  factory MatchProfile.fromJson(Map<String, dynamic>? json) {
    return MatchProfile(
      displayName: json?['displayName'] as String?,
      city: json?['city'] as String?,
    );
  }

  final String? displayName;
  final String? city;
}

class MatchUser {
  const MatchUser({required this.id, this.profile});

  factory MatchUser.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'];
    return MatchUser(
      id: json['id'] as String? ?? '',
      profile: profile is Map<String, dynamic>
          ? MatchProfile.fromJson(profile)
          : null,
    );
  }

  final String id;
  final MatchProfile? profile;
}

class Match {
  const Match({
    required this.id,
    required this.createdAt,
    this.conversationId,
    required this.user,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return Match(
      id: json['id'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      conversationId: json['conversationId'] as String?,
      user: user is Map<String, dynamic>
          ? MatchUser.fromJson(user)
          : const MatchUser(id: ''),
    );
  }

  final String id;
  final String createdAt;
  final String? conversationId;
  final MatchUser user;

  String get safeName {
    final name = (user.profile?.displayName ?? '').trim();
    return name.isEmpty ? 'Sanjari member' : name;
  }

  bool get canOpen =>
      conversationId != null && conversationId!.isNotEmpty;
}

/// Matches the 48-hour "New" window in matches.tsx. `now` is injectable so
/// the boundary stays unit-testable.
bool isNewMatch(DateTime createdAt, DateTime now) {
  return now.difference(createdAt).inMilliseconds <
      48 * 60 * 60 * 1000;
}
