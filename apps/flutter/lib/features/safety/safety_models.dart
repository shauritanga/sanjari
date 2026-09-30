// Safety Centre models. Pure Dart so parsing stays unit-testable. Ports
// the Guidance/AppealCase types from apps/mobile/app/safety.tsx.
class GuidanceSection {
  const GuidanceSection({
    required this.key,
    required this.title,
    required this.body,
  });

  factory GuidanceSection.fromJson(Map<String, dynamic> json) {
    return GuidanceSection(
      key: json['key'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
    );
  }

  final String key;
  final String title;
  final String body;
}

class Guidance {
  const Guidance({required this.title, this.sections = const []});

  factory Guidance.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const Guidance(title: '');
    final sections = json['sections'];
    return Guidance(
      title: json['title'] as String? ?? '',
      sections: sections is List
          ? sections
              .whereType<Map<String, dynamic>>()
              .map(GuidanceSection.fromJson)
              .toList()
          : const [],
    );
  }

  final String title;
  final List<GuidanceSection> sections;
}

class AppealReport {
  const AppealReport({required this.category, this.appealStatus});

  factory AppealReport.fromJson(Map<String, dynamic>? json) {
    return AppealReport(
      category: json?['category'] as String? ?? '',
      appealStatus: json?['appealStatus'] as String?,
    );
  }

  final String category;
  final String? appealStatus;

  AppealReport markSubmitted() {
    return AppealReport(category: category, appealStatus: 'submitted');
  }
}

class AppealCase {
  const AppealCase({
    required this.id,
    required this.status,
    required this.report,
  });

  factory AppealCase.fromJson(Map<String, dynamic> json) {
    return AppealCase(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      report: AppealReport.fromJson(
        json['report'] as Map<String, dynamic>?,
      ),
    );
  }

  final String id;
  final String status;
  final AppealReport report;

  bool get canAppeal => report.appealStatus == null;

  AppealCase markSubmitted() {
    return AppealCase(id: id, status: status, report: report.markSubmitted());
  }
}
