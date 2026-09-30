import '../../core/api_client.dart';
import 'conversation_summary.dart';

/// Typed wrapper over GET /conversations (the inbox list endpoint used by
/// messages.tsx; the envelope array lives in `data`).
class ConversationsRepository {
  ConversationsRepository(this._api);

  final ApiClient _api;

  Future<List<ConversationSummary>> fetchInbox() async {
    final body = await _api.get('/conversations');
    final data = body['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(ConversationSummary.fromJson)
        .toList();
  }
}
