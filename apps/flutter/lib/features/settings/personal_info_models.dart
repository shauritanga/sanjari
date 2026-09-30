import 'package:intl/intl.dart';

// Personal information models. Pure Dart (intl is pure Dart) so parsing,
// date formatting, and flow validation stay unit-testable. Ports the
// PersonalInfo interface and formatDate() from
// apps/mobile/app/settings/personal-info.tsx.
class PersonalInfo {
  const PersonalInfo({
    required this.email,
    this.phoneNumber,
    required this.dateOfBirth,
    this.displayName,
    this.gender,
  });

  factory PersonalInfo.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'];
    return PersonalInfo(
      email: json['email'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String?,
      dateOfBirth: json['dateOfBirth'] as String? ?? '',
      displayName: profile is Map<String, dynamic>
          ? profile['displayName'] as String?
          : null,
      gender: profile is Map<String, dynamic>
          ? profile['gender'] as String?
          : null,
    );
  }

  final String email;
  final String? phoneNumber;
  final String dateOfBirth;
  final String? displayName;
  final String? gender;

  PersonalInfo copyWith({String? email, String? phoneNumber}) {
    return PersonalInfo(
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      dateOfBirth: dateOfBirth,
      displayName: displayName,
      gender: gender,
    );
  }
}

/// Port of formatDate(): "June 15, 2024" via intl; '' when unparseable.
String formatBirthDate(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '';
  return DateFormat.yMMMMd().format(date);
}

/// Entry-gate validation mirroring the Expo disabled rules:
/// phone needs 8+ trimmed chars, email needs '@', codes need 4+ chars.
bool phoneEntryValid(String input) => input.trim().length >= 8;
bool emailEntryValid(String input) => input.contains('@');
bool codeValid(String code) => code.length >= 4;
