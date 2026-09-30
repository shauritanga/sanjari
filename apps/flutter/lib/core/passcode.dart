import 'dart:convert';

import 'package:crypto/crypto.dart';

// Passcode domain logic. Pure Dart (package:crypto is pure Dart) so hashing,
// verification, and validation stay unit-testable with `dart test`. Ports
// apps/mobile/src/lib/passcode.ts: the PIN is SHA-256 hashed, and both keys
// keep Expo's exact storage names so a device migrating between clients
// keeps its lock state. Concrete storage/biometric backends live in
// passcode_devices.dart because they need platform channels.

// Storage seam: secure storage needs platform channels, so tests
// substitute an in-memory fake (same pattern as InboxRealtime).
abstract class PasscodeStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

// Biometric seam: local_auth needs a device, so tests substitute a fake.
abstract class Biometrics {
  /// Mirrors hasHardwareAsync() && isEnrolledAsync().
  Future<bool> isAvailable();

  /// System biometric prompt; mirrors authenticateAsync() with the
  /// 'Unlock Sanjari' prompt. local_auth has no per-call fallback label,
  /// so the passcode fallback lives in the lock screen UI instead.
  Future<bool> authenticate();
}

class PasscodeStore {
  PasscodeStore({required this.storage, required this.biometrics});

  static const pinHashKey = 'sanjari.passcode.hash';
  static const biometricKey = 'sanjari.passcode.biometric';

  final PasscodeStorage storage;
  final Biometrics biometrics;

  /// SHA-256 hex of the PIN string (expo-crypto digestStringAsync parity).
  static String hashPin(String pin) {
    return sha256.convert(utf8.encode(pin)).toString();
  }

  Future<bool> isPasscodeEnabled() async {
    try {
      return await storage.read(pinHashKey) != null;
    } catch (_) {
      return false;
    }
  }

  Future<void> setPasscode(String pin) async {
    await storage.write(pinHashKey, hashPin(pin));
  }

  Future<void> clearPasscode() async {
    await storage.delete(pinHashKey);
    await storage.delete(biometricKey);
  }

  Future<bool> verifyPasscode(String pin) async {
    try {
      final hash = await storage.read(pinHashKey);
      if (hash == null) return false;
      return hash == hashPin(pin);
    } catch (_) {
      return false;
    }
  }

  Future<bool> isBiometricPreferred() async {
    try {
      return await storage.read(biometricKey) == 'true';
    } catch (_) {
      return false;
    }
  }

  Future<void> setBiometricPreferred(bool enabled) async {
    if (enabled) {
      await storage.write(biometricKey, 'true');
    } else {
      await storage.delete(biometricKey);
    }
  }

  /// Biometric unlock attempt from passcode.ts: false when the device
  /// cannot do biometrics, otherwise the system prompt result.
  Future<bool> tryBiometricUnlock() async {
    if (!await biometrics.isAvailable()) return false;
    try {
      return await biometrics.authenticate();
    } catch (_) {
      return false;
    }
  }
}

/// Create/confirm step validation from passcode.tsx: 4+ digits to proceed,
/// matching confirmation to store.
bool pinLongEnough(String pin) => pin.length >= 4;
bool pinsMatch(String first, String second) => first == second;
