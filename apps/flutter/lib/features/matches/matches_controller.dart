import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'match.dart';
import 'matches_repository.dart';

/// Mutual matches list state. Ports the load/unmatch logic from
/// apps/mobile/app/(tabs)/matches.tsx.
class MatchesController extends ChangeNotifier {
  MatchesController(this._repository);

  final MatchesRepository _repository;

  List<Match> _matches = [];
  bool _loading = true;
  String? _error;
  String? _busyMatchId;

  List<Match> get matches => _matches;
  bool get loading => _loading;
  String? get error => _error;
  String? get busyMatchId => _busyMatchId;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _matches = await _repository.fetchMatches();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadMatches';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> unmatch(Match match) async {
    _busyMatchId = match.id;
    _error = null;
    notifyListeners();
    try {
      await _repository.unmatch(match.id);
      _matches = _matches.where((e) => e.id != match.id).toList();
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToUnmatch';
    } finally {
      _busyMatchId = null;
      notifyListeners();
    }
  }
}

final matchesRepositoryProvider = Provider<MatchesRepository>((ref) {
  return MatchesRepository(ref.watch(sessionProvider).api);
});

final matchesControllerProvider =
    ChangeNotifierProvider<MatchesController>((ref) {
  return MatchesController(ref.watch(matchesRepositoryProvider));
});
