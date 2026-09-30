// Settings hub models. Pure Dart so parsing and labels stay unit-testable.
// Ports the Session/NotificationPreference interfaces and CATEGORY_LABELS
// from apps/mobile/app/settings.tsx.
class UserSession {
  const UserSession({required this.id, this.deviceId});

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      id: json['id'] as String? ?? '',
      deviceId: json['deviceId'] as String?,
    );
  }

  final String id;
  final String? deviceId;

  String deviceLabel(String unknown) {
    final label = (deviceId ?? '').trim();
    return label.isEmpty ? unknown : label;
  }
}

class NotificationPreference {
  const NotificationPreference({
    required this.category,
    this.push = false,
    this.email = false,
    this.sms = false,
  });

  factory NotificationPreference.fromJson(Map<String, dynamic> json) {
    return NotificationPreference(
      category: json['category'] as String? ?? '',
      push: json['push'] == true,
      email: json['email'] == true,
      sms: json['sms'] == true,
    );
  }

  final String category;
  final bool push;
  final bool email;
  final bool sms;

  NotificationPreference copyWith({bool? push}) {
    return NotificationPreference(
      category: category,
      push: push ?? this.push,
      email: email,
      sms: sms,
    );
  }
}

/// Profile visibility modes. The API may also return 'hidden'; like Expo,
/// anything other than 'liked_only' is treated as 'everyone'.
enum VisibilityMode { everyone, likedOnly }

/// Maps a notification category to its i18n key. Unknown categories fall
/// through so tr() renders them raw — mirroring CATEGORY_LABELS ?? category.
String categoryKey(String category) {
  switch (category) {
    case 'matches':
      return 'notifMatches';
    case 'messages':
      return 'notifMessages';
    case 'likes':
      return 'notifLikes';
    case 'promotions':
      return 'notifPromotions';
    default:
      return category;
  }
}

VisibilityMode visibilityModeFrom(String? mode) {
  return mode == 'liked_only' ? VisibilityMode.likedOnly : VisibilityMode.everyone;
}

extension VisibilityModeData on VisibilityMode {
  String get value =>
      this == VisibilityMode.likedOnly ? 'liked_only' : 'everyone';
}
