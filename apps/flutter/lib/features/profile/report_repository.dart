import '../../core/api_client.dart';

/// Typed wrapper over POST /reports and POST /blocks/:id (see
/// apps/mobile/app/profile/report.tsx and apps/mobile/app/profile/block.tsx).
class ReportRepository {
  ReportRepository(this._api);

  final ApiClient _api;

  Future<void> submitReport(
    String userId,
    String category,
    String description,
  ) {
    return _api.post('/reports', {
      'reportedUserId': userId,
      'category': category,
      'description': description,
    });
  }

  Future<void> blockUser(String userId, String reason) {
    return _api.post('/blocks/$userId', {'reason': reason});
  }
}
