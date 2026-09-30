import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'passcode.dart';

// Device backends for the passcode seams. These need platform channels, so
// they live apart from the pure domain logic in passcode.dart (which is
// what `dart test` exercises).
class SecurePasscodeStorage implements PasscodeStorage {
  SecurePasscodeStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class LocalAuthBiometrics implements Biometrics {
  LocalAuthBiometrics({LocalAuthentication? auth})
      : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  @override
  Future<bool> isAvailable() async {
    try {
      final results = await Future.wait([
        _auth.isDeviceSupported(),
        _auth.canCheckBiometrics,
      ]);
      return results[0] && results[1];
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Unlock Sanjari',
        options: const AuthenticationOptions(biometricOnly: true),
      );
    } catch (_) {
      return false;
    }
  }
}
