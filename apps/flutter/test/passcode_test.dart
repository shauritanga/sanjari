import 'package:test/test.dart';
import 'package:sanjari/core/passcode.dart';

class MemoryStorage implements PasscodeStorage {
  final values = <String, String>{};
  var failReads = false;

  @override
  Future<String?> read(String key) async {
    if (failReads) throw StateError('unavailable');
    return values[key];
  }

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

class FakeBiometrics implements Biometrics {
  FakeBiometrics({this.available = true, this.result = true});

  final bool available;
  final bool result;
  var authenticateCalls = 0;

  @override
  Future<bool> isAvailable() async => available;

  @override
  Future<bool> authenticate() async {
    authenticateCalls++;
    return result;
  }
}

void main() {
  group('PIN hashing', () {
    test('is deterministic, opaque, and salt-free like expo-crypto', () {
      final first = PasscodeStore.hashPin('123456');
      expect(first, PasscodeStore.hashPin('123456'));
      expect(first, isNot(contains('123456')));
      expect(first, isNot(PasscodeStore.hashPin('654321')));
      expect(first.length, 64);
    });
  });

  group('PasscodeStore', () {
    test('set, verify, and clear round-trip with exact Expo keys', () async {
      final storage = MemoryStorage();
      final store = PasscodeStore(
        storage: storage,
        biometrics: FakeBiometrics(),
      );

      expect(await store.isPasscodeEnabled(), isFalse);
      expect(await store.verifyPasscode('123456'), isFalse);

      await store.setPasscode('123456');
      expect(storage.values.keys, contains('sanjari.passcode.hash'));
      expect(await store.isPasscodeEnabled(), isTrue);
      expect(await store.verifyPasscode('123456'), isTrue);
      expect(await store.verifyPasscode('000000'), isFalse);

      await store.clearPasscode();
      expect(await store.isPasscodeEnabled(), isFalse);
    });

    test('clear also drops the biometric preference', () async {
      final storage = MemoryStorage();
      final store = PasscodeStore(
        storage: storage,
        biometrics: FakeBiometrics(),
      );

      await store.setPasscode('123456');
      await store.setBiometricPreferred(true);
      expect(await store.isBiometricPreferred(), isTrue);

      await store.clearPasscode();
      expect(await store.isBiometricPreferred(), isFalse);
    });

    test('tryBiometricUnlock gates on availability', () async {
      final unavailable = PasscodeStore(
        storage: MemoryStorage(),
        biometrics: FakeBiometrics(available: false, result: true),
      );
      expect(await unavailable.tryBiometricUnlock(), isFalse);

      final denied = PasscodeStore(
        storage: MemoryStorage(),
        biometrics: FakeBiometrics(available: true, result: false),
      );
      expect(await denied.tryBiometricUnlock(), isFalse);

      final bio = FakeBiometrics(available: true, result: true);
      final allowed = PasscodeStore(
        storage: MemoryStorage(),
        biometrics: bio,
      );
      expect(await allowed.tryBiometricUnlock(), isTrue);
      expect(bio.authenticateCalls, 1);
    });

    test('storage failures degrade to locked-out defaults', () async {
      final storage = MemoryStorage()..failReads = true;
      final store = PasscodeStore(
        storage: storage,
        biometrics: FakeBiometrics(),
      );

      expect(await store.isPasscodeEnabled(), isFalse);
      expect(await store.verifyPasscode('123456'), isFalse);
      expect(await store.isBiometricPreferred(), isFalse);
    });
  });

  group('create/confirm validation', () {
    test('mirrors the Expo length and match rules', () {
      expect(pinLongEnough('1234'), isTrue);
      expect(pinLongEnough('123'), isFalse);
      expect(pinsMatch('123456', '123456'), isTrue);
      expect(pinsMatch('123456', '654321'), isFalse);
    });
  });
}
