import 'package:intl/intl.dart';

// Premium models. Pure Dart (intl is pure Dart) so parsing and formatting
// stay unit-testable. Ports the Plan/Status types from
// apps/mobile/app/premium.tsx.
class PremiumPlan {
  const PremiumPlan({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.priceCents,
    required this.currency,
  });

  factory PremiumPlan.fromJson(Map<String, dynamic> json) {
    return PremiumPlan(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      priceCents: (json['priceCents'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? '',
    );
  }

  final String id;
  final String code;
  final String title;
  final String description;
  final int priceCents;
  final String currency;

  /// Mirrors `(plan.priceCents / 100).toFixed(2) + ' ' + plan.currency`.
  String priceLabel() {
    final major = (priceCents / 100).toStringAsFixed(2);
    return currency.isEmpty ? major : '$major $currency';
  }
}

class StatusPlan {
  const StatusPlan({required this.code, required this.title});

  factory StatusPlan.fromJson(Map<String, dynamic> json) {
    return StatusPlan(
      code: json['code'] as String? ?? '',
      title: json['title'] as String? ?? '',
    );
  }

  final String code;
  final String title;
}

class PremiumStatus {
  const PremiumStatus({
    required this.status,
    this.plan,
    this.endsAt,
    this.entitlements = const {},
  });

  factory PremiumStatus.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const PremiumStatus(status: '');
    final plan = json['plan'];
    final entitlements = json['entitlements'];
    return PremiumStatus(
      status: json['status'] as String? ?? '',
      plan: plan is Map<String, dynamic> ? StatusPlan.fromJson(plan) : null,
      endsAt: json['endsAt'] as String?,
      entitlements: entitlements is Map
          ? entitlements.map(
              (key, value) => MapEntry(key.toString(), value == true),
            )
          : const {},
    );
  }

  final String status;
  final StatusPlan? plan;
  final String? endsAt;
  final Map<String, bool> entitlements;

  /// Enabled entitlement keys, mirroring the Object.entries filter in
  /// premium.tsx.
  List<String> get enabledEntitlements => [
        for (final entry in entitlements.entries)
          if (entry.value) entry.key,
      ];

  /// Mirrors `Ends ${new Date(endsAt).toLocaleDateString()}` via intl;
  /// null when there is no end date or it does not parse.
  String? endsLabel() {
    if (endsAt == null || endsAt!.isEmpty) return null;
    final date = DateTime.tryParse(endsAt!);
    if (date == null) return null;
    return DateFormat.yMd().format(date);
  }
}
