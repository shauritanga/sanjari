import { CheckmarkBadge01Icon, IdVerifiedIcon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectableCard } from '../../src/components/SelectableCard';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { stepNumber } from '../../src/onboarding/steps';
import { captureAndSubmitVerification, type VerificationCase, type VerificationType } from '../../src/verification';

function statusLabel(status?: string) {
  switch (status) {
    case 'approved':
      return 'Verified';
    case 'submitted':
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Rejected — try again';
    default:
      return 'Not started';
  }
}

export default function VerificationScreen() {
  const { colors, spacing } = useAppTheme();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<VerificationType | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<VerificationCase[]>('/onboarding/verification');
      setCases(result.data ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load verification status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  function latestFor(type: VerificationType) {
    return cases.find((item) => item.type === type);
  }

  function colorFor(status?: string) {
    if (status === 'approved') return colors.success;
    if (status === 'rejected') return colors.error;
    if (status) return colors.accent;
    return colors.textSecondary;
  }

  async function captureAndSubmit(type: VerificationType) {
    setError(null);
    setRequesting(type);
    try {
      const submitted = await captureAndSubmitVerification(type);
      if (submitted) await loadStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit verification.');
    } finally {
      setRequesting(null);
    }
  }

  const selfieCase = latestFor('selfie_liveness');
  const idCase = latestFor('identity_document');

  return (
    <OnboardingScreen
      step={stepNumber('verification')}
      title="Verify your profile"
      subtitle="Verified profiles get more matches and build trust."
      primaryLabel="Continue"
      onPrimaryPress={() => router.push('/onboarding/notifications')}
      footerNote={error ?? 'You can complete verification later from your profile.'}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <SelectableCard
            title="Selfie verification"
            description={
              requesting === 'selfie_liveness' ? 'Uploading…' : statusLabel(selfieCase?.status)
            }
            icon={<AppIcon icon={CheckmarkBadge01Icon} color={colorFor(selfieCase?.status)} size={26} />}
            selected={selfieCase?.status === 'approved'}
            onPress={() => {
              if (requesting || selfieCase?.status === 'approved') return;
              void captureAndSubmit('selfie_liveness');
            }}
          />
          <SelectableCard
            title="ID verification"
            description={requesting === 'identity_document' ? 'Uploading…' : statusLabel(idCase?.status)}
            icon={<AppIcon icon={IdVerifiedIcon} color={colorFor(idCase?.status)} size={26} />}
            selected={idCase?.status === 'approved'}
            onPress={() => {
              if (requesting || idCase?.status === 'approved') return;
              void captureAndSubmit('identity_document');
            }}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Tapping a card opens your camera to take a photo for that verification step. ID
            verification is optional and adds an extra layer of trust to your profile.
          </Text>
        </View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  hint: { fontSize: 13, lineHeight: 18 }
});
