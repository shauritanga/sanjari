import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_HASH_KEY = 'sanjari.passcode.hash';
const BIOMETRIC_ENABLED_KEY = 'sanjari.passcode.biometric';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function isPasscodeEnabled(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return hash !== null;
}

export async function setPasscode(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin));
}

export async function clearPasscode(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function verifyPasscode(pin: string): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!hash) return false;
  return hash === (await hashPin(pin));
}

export async function isBiometricPreferred(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function setBiometricPreferred(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  else await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function tryBiometricUnlock(): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Sanjari',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: true,
  });
  return result.success;
}
