import '../../core/api_client.dart';
import '../likes/like_received.dart';
import 'candidate.dart';

/// One page of the discovery queue.
class DiscoveryPage {
  const DiscoveryPage({required this.candidates, this.nextCursor});

  final List<Candidate> candidates;
  final String? nextCursor;
}

/// Discovery preferences. Ports DiscoveryPreference + DEFAULT_PREFERENCE
/// from apps/mobile/app/filters.tsx.
class DiscoveryPreference {
  const DiscoveryPreference({
    this.minAge = 18,
    this.maxAge = 80,
    this.maxDistanceKm = 50,
    this.genders = const [],
    this.intentions = const [],
    this.languages = const [],
    this.interests = const [],
    this.verifiedOnly = false,
    this.showDistance = true,
  });

  factory DiscoveryPreference.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DiscoveryPreference();
    return DiscoveryPreference(
      minAge: (json['minAge'] as num?)?.toInt() ?? 18,
      maxAge: (json['maxAge'] as num?)?.toInt() ?? 80,
      maxDistanceKm: (json['maxDistanceKm'] as num?)?.toInt() ?? 50,
      genders: _stringList(json['genders']),
      intentions: _stringList(json['intentions']),
      languages: _stringList(json['languages']),
      interests: _stringList(json['interests']),
      verifiedOnly: json['verifiedOnly'] == true,
      showDistance: json['showDistance'] != false,
    );
  }

  final int minAge;
  final int maxAge;
  final int maxDistanceKm;
  final List<String> genders;
  final List<String> intentions;
  final List<String> languages;
  final List<String> interests;
  final bool verifiedOnly;
  final bool showDistance;

  static List<String> _stringList(dynamic value) {
    if (value is List) return value.whereType<String>().toList();
    return const [];
  }

  Map<String, dynamic> toJson() => {
        'minAge': minAge,
        'maxAge': maxAge,
        'maxDistanceKm': maxDistanceKm,
        'genders': genders,
        'intentions': intentions,
        'languages': languages,
        'interests': interests,
        'verifiedOnly': verifiedOnly,
        'showDistance': showDistance,
      };

  DiscoveryPreference copyWith({
    int? minAge,
    int? maxAge,
    int? maxDistanceKm,
    List<String>? genders,
    List<String>? intentions,
    List<String>? languages,
    List<String>? interests,
    bool? verifiedOnly,
    bool? showDistance,
  }) {
    return DiscoveryPreference(
      minAge: minAge ?? this.minAge,
      maxAge: maxAge ?? this.maxAge,
      maxDistanceKm: maxDistanceKm ?? this.maxDistanceKm,
      genders: genders ?? this.genders,
      intentions: intentions ?? this.intentions,
      languages: languages ?? this.languages,
      interests: interests ?? this.interests,
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      showDistance: showDistance ?? this.showDistance,
    );
  }
}

/// Typed wrapper over the discovery endpoints in
/// apps/api/src/discovery/discovery.controller.ts.
class DiscoveryRepository {
  DiscoveryRepository(this._api);

  final ApiClient _api;

  Future<DiscoveryPage> fetchQueue({
    String? cursor,
    bool recentlyActive = false,
    bool newMembers = false,
  }) async {
    final params = <String, String>{
      if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      if (recentlyActive) 'recentlyActive': 'true',
      if (newMembers) 'newMembers': 'true',
    };
    final query = params.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final body = await _api.get('/discovery${query.isEmpty ? '' : '?$query'}');
    final data = body['data'];
    final candidates = data is List
        ? data
            .whereType<Map<String, dynamic>>()
            .map(Candidate.fromJson)
            .toList()
        : <Candidate>[];
    final next = body['nextCursor'];
    return DiscoveryPage(
      candidates: candidates,
      nextCursor: next is String && next.isNotEmpty ? next : null,
    );
  }

  Future<LikeResult> like(
    String userId, {
    bool priority = false,
    String? comment,
  }) async {
    final body = await _api.post('/discovery/$userId/like', {
      'priority': priority,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
      'idempotencyKey':
          '$userId-${DateTime.now().millisecondsSinceEpoch}',
    });
    final data = body['data'];
    if (data is! Map<String, dynamic>) {
      throw ApiException('Like response was incomplete.');
    }
    return LikeResult.fromJson(data);
  }

  Future<void> pass(String userId) {
    return _api.post('/discovery/$userId/pass', {
      'idempotencyKey':
          '$userId-${DateTime.now().millisecondsSinceEpoch}',
    });
  }

  Future<void> undo(String targetUserId) {
    return _api.post('/discovery/undo', {'targetUserId': targetUserId});
  }

  Future<DiscoveryPreference> getPreferences() async {
    final body = await _api.get('/onboarding/discovery-preferences');
    final data = body['data'];
    return DiscoveryPreference.fromJson(
      data is Map<String, dynamic> ? data : null,
    );
  }

  Future<void> savePreferences(DiscoveryPreference preference) {
    return _api.put(
      '/onboarding/discovery-preferences',
      preference.toJson(),
    );
  }

  /// Ports the likes-received load in likes.tsx
  /// (GET /discovery/likes-received, array in `data`).
  Future<List<LikeReceived>> fetchLikesReceived() async {
    final body = await _api.get('/discovery/likes-received');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(LikeReceived.fromJson)
        .toList();
  }
}
