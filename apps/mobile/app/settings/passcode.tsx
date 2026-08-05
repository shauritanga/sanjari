import { ArrowLeft01Icon, FingerPrintIcon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { AppTextInput } from '../../src/components/AppTextInput';
import { ToggleRow } from '../../src/components/ToggleRow';
import {
  clearPasscode,
  isBiometricAvailable,
  isBiometricPreferred,
  isPasscodeEnabled,
  setBiometricPreferred,
  setPasscode,
  verifyPasscode,
} from '../../src/lib/passcode';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function PasscodeSettingsScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [step, setStep] = useState<'idle' | 'create' | 'confirm' | 'disable'>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([isPasscodeEnabled(), isBiometricAvailable(), isBiometricPreferred()]).then(
      ([passcodeOn, hardware, biometricOn]) => {
        setEnabled(passcodeOn);
        setBiometricAvailable(hardware);
        setBiometricEnabled(biometricOn);
      },
    );
  }, []);

  function startCreate() {
    setStep('create');
    setFirstPin('');
    setPinInput('');
    setError('');
  }

  function submitCreateStep() {
    if (pinInput.length < 4) {
      setError('Use at least 4 digits.');
      return;
    }
    if (step === 'create') {
      setFirstPin(pinInput);
      setPinInput('');
      setStep('confirm');
      setError('');
      return;
    }
    if (pinInput !== firstPin) {
      setError('Passcodes did not match. Try again.');
      setPinInput('');
      setStep('create');
      setFirstPin('');
      return;
    }
    void setPasscode(pinInput).then(() => {
      setEnabled(true);
      setStep('idle');
      setPinInput('');
      setFirstPin('');
    });
  }

  function startDisable() {
    setStep('disable');
    setPinInput('');
    setError('');
  }

  async function submitDisable() {
    const valid = await verifyPasscode(pinInput);
    if (!valid) {
      setError('Incorrect passcode.');
      return;
    }
    await clearPasscode();
    setEnabled(false);
    setBiometricEnabled(false);
    setStep('idle');
    setPinInput('');
  }

  async function toggleBiometric(value: boolean) {
    await setBiometricPreferred(value);
    setBiometricEnabled(value);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Passcode lock</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, padding: spacing.md }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon icon={LockPasswordIcon} color={colors.accentAlt} size={22} />
          </View>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
            {enabled ? 'Passcode lock is on' : 'Add a passcode lock'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Require a passcode (and optionally biometrics) to open Sanjari, so a shared or lost device stays private.
          </Text>
          {step === 'idle' ? (
            <AppButton
              label={enabled ? 'Turn off passcode' : 'Set a passcode'}
              variant={enabled ? 'secondary' : 'primary'}
              onPress={enabled ? startDisable : startCreate}
            />
          ) : null}
        </View>

        {step === 'create' || step === 'confirm' ? (
          <View style={{ gap: spacing.md }}>
            <AppTextInput
              label={step === 'create' ? 'Create a passcode' : 'Confirm your passcode'}
              value={pinInput}
              onChangeText={setPinInput}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              error={error}
            />
            <AppButton label="Continue" onPress={submitCreateStep} disabled={pinInput.length < 4} />
          </View>
        ) : null}

        {step === 'disable' ? (
          <View style={{ gap: spacing.md }}>
            <AppTextInput
              label="Enter your current passcode"
              value={pinInput}
              onChangeText={setPinInput}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              error={error}
            />
            <AppButton label="Turn off passcode" variant="secondary" onPress={() => void submitDisable()} disabled={pinInput.length < 4} />
          </View>
        ) : null}

        {enabled && biometricAvailable && step === 'idle' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, padding: spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppIcon icon={FingerPrintIcon} color={colors.accentAlt} size={20} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Biometric unlock</Text>
            </View>
            <ToggleRow
              title="Use Face ID / fingerprint"
              description="Falls back to your passcode if biometrics fail."
              value={biometricEnabled}
              onChange={(value) => void toggleBiometric(value)}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontWeight: '700' },
  content: { paddingBottom: 48 },
  card: { borderWidth: 1, gap: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
