import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/session.dart';

/// Exposes the app-wide [SessionController] to the widget tree.
final sessionProvider = ChangeNotifierProvider<SessionController>((ref) {
  throw UnimplementedError('sessionProvider must be overridden in main()');
});
