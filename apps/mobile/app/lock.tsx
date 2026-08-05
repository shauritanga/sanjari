import { FingerPrintIcon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { AppIcon } from '../src/components/AppIcon';
import { AppTextInput } from '../src/components/AppTextInput';
import { isBiometricPreferred, tryBiometricUnlock, verifyPasscode } from '../src/lib/passcode';
import { useAppTheme } from '../src/theme/useAppTheme';

export default function LockScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checkingBiometric, setCheckingBiometric] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const unlock = useCallback(() => {
    router.replace((next as never) ?? '/(tabs)/discover');
  }, [next]);

  useEffect(() => {
    let cancelled = false;
    async function attemptBiometric() {
      if (await isBiometricPreferred()) {
        const success = await tryBiometricUnlock();
        if (!cancelled && success) {
          unlock();
          return;
        }
      }
      if (!cancelled) setCheckingBiometric(false);
    }
    void attemptBiometric();
    return () => {
      cancelled = true;
    };
  }, [unlock]);

  async function submitPin() {
    setVerifying(true);
    setError('');
    const valid = await verifyPasscode(pin);
    setVerifying(false);
    if (valid) {
      unlock();
      return;
    }
    setError('Incorrect passcode.');
    setPin('');
  }

  async function retryBiometric() {
    const success = await tryBiometricUnlock();
    if (success) unlock();
  }

  if (checkingBiometric) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { gap: spacing.lg, padding: spacing.lg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
          <AppIcon icon={LockPasswordIcon} color={colors.accentAlt} size={28} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h2.fontSize }]}>
            Enter your passcode
          </Text>
          <Text style={{ color: colors.textSecondary }}>Sanjari is locked for your privacy.</Text>
        </View>
        <AppTextInput
          label="Passcode"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          error={error}
        />
        <AppButton
          label="Unlock"
          onPress={() => void submitPin()}
          disabled={pin.length < 4}
          loading={verifying}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void retryBiometric()}
          style={[styles.biometricRow, { gap: spacing.sm }]}
        >
          <AppIcon icon={FingerPrintIcon} color={colors.accentAlt} size={20} />
          <Text style={{ color: colors.accentAlt, fontWeight: '700' }}>Use biometric unlock</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800' },
  biometricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
});
