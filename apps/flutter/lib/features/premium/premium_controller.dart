import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'premium_models.dart';
import 'premium_repository.dart';

/// Premium page state. Ports the parallel plans+status load from
/// premium.tsx. Tapping purchase surfaces the store-flow notice (real
/// store purchase verification is a later phase, like Expo's stub).
class PremiumController extends ChangeNotifier {
  PremiumController(this._repository);

  final PremiumRepository _repository;

  List<PremiumPlan> _plans = [];
  PremiumStatus? _status;
  bool _loading = true;
  String? _error;
  String? _notice;

  List<PremiumPlan> get plans => _plans;
  PremiumStatus? get status => _status;
  bool get loading => _loading;
  String? get error => _error;
  String? get notice => _notice;

  Future<void> load() async {
    _loading = true;
    _error = null;
    _notice = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _repository.fetchPlans(),
        _repository.fetchStatus(),
      ]);
      _plans = results[0] as List<PremiumPlan>;
      _status = results[1] as PremiumStatus?;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadPremium';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Expo's purchase button only explains that purchases complete through
  /// the verified app-store flow; no store SDK is wired on either client.
  void explainPurchase() {
    _notice = 'purchaseViaStore';
    notifyListeners();
  }
}

final premiumRepositoryProvider = Provider<PremiumRepository>((ref) {
  return PremiumRepository(ref.watch(sessionProvider).api);
});

final premiumControllerProvider =
    ChangeNotifierProvider<PremiumController>((ref) {
  return PremiumController(ref.watch(premiumRepositoryProvider));
});
