// Chaperone models. Pure Dart so parsing and form validation stay
// unit-testable. Ports the Chaperone interface and save-button rule from
// apps/mobile/app/settings/chaperone.tsx.
class Chaperone {
  const Chaperone({
    required this.name,
    required this.relationship,
    required this.email,
    required this.forwardEnabled,
  });

  factory Chaperone.fromJson(Map<String, dynamic> json) {
    return Chaperone(
      name: json['name'] as String? ?? '',
      relationship: json['relationship'] as String? ?? '',
      email: json['email'] as String? ?? '',
      forwardEnabled: json['forwardEnabled'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'relationship': relationship,
        'email': email,
        'forwardEnabled': forwardEnabled,
      };

  final String name;
  final String relationship;
  final String email;
  final bool forwardEnabled;
}

/// Mirrors the Expo save-button rule: all fields filled and the email
/// contains '@'.
bool chaperoneFormValid(
  String name,
  String relationship,
  String email,
) {
  return name.trim().isNotEmpty &&
      relationship.trim().isNotEmpty &&
      email.contains('@');
}
