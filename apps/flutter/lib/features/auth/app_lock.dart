import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Cold-start app-lock gate. False until the user unlocks (or until the
/// first check finds no passcode set); the router redirect consults it so
/// an enabled passcode re-locks the app on every launch, mirroring the
/// splash gate in apps/mobile/app/index.tsx.
final appLockGateProvider = StateProvider<bool>((ref) => false);
