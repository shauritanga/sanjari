import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/session_provider.dart';
import 'safety_models.dart';
import 'safety_repository.dart';

/// Safety Centre state. Ports the loads and mutations from safety.tsx:
/// locale-aware guidance plus open appeals load together; appeal submit
/// marks the case submitted locally; export/deactivation/deletion report
/// status lines. Deactivation signs out via the page's session (the router
/// guard then redirects to login).
class SafetyController extends ChangeNotifier {
  SafetyController(this._repository);

  final SafetyRepository _repository;

  Guidance? _guidance;
  List<AppealCase> _appeals = [];
  bool _loading = true;
  String? _error;
  String? _exportStatus;
  String? _exportError;
  String? _accountStatus;
  String? _accountError;
  bool _exporting = false;
  bool _deactivating = false;
  bool _deleting = false;
  final Map<String, String> _statements = {};

  Guidance? get guidance => _guidance;
  List<AppealCase> get appeals => _appeals;
  bool get loading => _loading;
  String? get error => _error;
  String? get exportStatus => _exportStatus;
  String? get exportError => _exportError;
  String? get accountStatus => _accountStatus;
  String? get accountError => _accountError;
  bool get exporting => _exporting;
  bool get deactivating => _deactivating;
  bool get deleting => _deleting;

  String statementFor(String caseId) => _statements[caseId] ?? '';

  void setStatement(String caseId, String value) {
    _statements[caseId] = value;
  }

  Future<void> load(String locale) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _repository.fetchGuidance(locale),
        _repository.fetchAppeals(),
      ]);
      _guidance = results[0] as Guidance?;
      _appeals = results[1] as List<AppealCase>;
    } catch (e) {
      _error = e is ApiException ? e.message : 'unableToLoadGuidance';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> submitAppeal(String caseId) async {
    final statement = statementFor(caseId).trim();
    if (statement.isEmpty) return;
    try {
      await _repository.submitAppeal(caseId, statement);
      _appeals = _appeals
          .map((item) => item.id == caseId ? item.markSubmitted() : item)
          .toList();
      _statements.remove(caseId);
      notifyListeners();
    } catch (e) {
      _accountError =
          e is ApiException ? e.message : 'unableToSubmitAppeal';
      notifyListeners();
    }
  }

  Future<void> requestExport() async {
    _exporting = true;
    _exportStatus = null;
    _exportError = null;
    notifyListeners();
    try {
      _exportStatus = await _repository.requestExport();
    } catch (e) {
      _exportError = e is ApiException ? e.message : 'unableToExport';
    } finally {
      _exporting = false;
      notifyListeners();
    }
  }

  /// Deactivates on the server; the page signs out afterwards.
  /// Returns false when deactivation failed (status line is set instead).
  Future<bool> deactivate() async {
    _deactivating = true;
    _accountStatus = null;
    _accountError = null;
    notifyListeners();
    try {
      await _repository.deactivate();
      return true;
    } catch (e) {
      _accountError =
          e is ApiException ? e.message : 'unableToDeactivate';
      notifyListeners();
      return false;
    } finally {
      _deactivating = false;
      notifyListeners();
    }
  }

  Future<void> requestDeletion() async {
    _deleting = true;
    _accountStatus = null;
    _accountError = null;
    notifyListeners();
    try {
      _accountStatus = await _repository.requestDeletion();
    } catch (e) {
      _accountError =
          e is ApiException ? e.message : 'unableToRequestDeletion';
    } finally {
      _deleting = false;
      notifyListeners();
    }
  }
}

final safetyRepositoryProvider = Provider<SafetyRepository>((ref) {
  return SafetyRepository(ref.watch(sessionProvider).api);
});

final safetyControllerProvider =
    ChangeNotifierProvider<SafetyController>((ref) {
  return SafetyController(ref.watch(safetyRepositoryProvider));
});
