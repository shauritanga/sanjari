import { Delete02Icon, Mic01Icon, PauseCircleIcon, PlayCircleIcon, StopCircleIcon } from '@hugeicons/core-free-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppIcon } from '../../src/components/AppIcon';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

const MAX_DURATION_MS = 60_000;

export default function VoiceIntroScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const voiceIntroKey = useOnboardingStore((state) => state.voiceIntroKey);
  const setVoiceIntroKey = useOnboardingStore((state) => state.setVoiceIntroKey);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(Boolean(voiceIntroKey));
  const [error, setError] = useState<string | null>(null);
  const stoppingRef = useRef(false);

  const player = useAudioPlayer(recordingUri);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= MAX_DURATION_MS && !stoppingRef.current) {
      void handleStop();
    }
  }, [recorderState.isRecording, recorderState.durationMillis]);

  async function handleStartRecording() {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is needed to record a voice intro.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      setRecordingUri(null);
      setUploaded(false);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start recording.');
    }
  }

  async function handleStop() {
    stoppingRef.current = true;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      stoppingRef.current = false;
      if (!uri) {
        setError('Recording did not save. Please try again.');
        return;
      }
      setRecordingUri(uri);
      await uploadRecording(uri);
    } catch (cause) {
      stoppingRef.current = false;
      setError(cause instanceof Error ? cause.message : 'Unable to stop recording.');
    }
  }

  async function uploadRecording(uri: string) {
    setUploading(true);
    setError(null);
    try {
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();
      const mimeType = 'audio/m4a';
      const presign = await api.post<{ storageKey: string; uploadUrl: string }>('/onboarding/voice-intro/presign', {
        mimeType,
        sizeBytes: blob.size
      });
      if (!presign.data) throw new Error('Unable to prepare upload.');
      await fetch(presign.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: blob });
      await api.post('/onboarding/voice-intro/complete', { storageKey: presign.data.storageKey });
      setVoiceIntroKey(presign.data.storageKey);
      setUploaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await api.remove('/onboarding/voice-intro');
      setVoiceIntroKey(null);
      setRecordingUri(null);
      setUploaded(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove your recording.');
    }
  }

  function togglePlayback() {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  const isRecording = recorderState.isRecording;
  const hasRecording = uploaded || Boolean(recordingUri);
  const seconds = Math.min(60, Math.round((recorderState.durationMillis ?? 0) / 1000));

  return (
    <OnboardingScreen
      step={stepNumber('voice-intro')}
      title="Add a voice intro"
      subtitle="Let your personality shine — optional but boosts your profile."
      primaryLabel="Continue"
      onPrimaryPress={() => router.push('/onboarding/review')}
      secondaryLabel="Skip"
      onSecondaryPress={() => router.push('/onboarding/review')}
      {...(error ? { footerNote: error } : {})}
      scroll={false}
    >
      <View style={styles.center}>
        {!hasRecording ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
              onPress={() => {
                void (isRecording ? handleStop() : handleStartRecording());
              }}
              style={[
                styles.recordButton,
                {
                  borderRadius: radius.pill,
                  backgroundColor: isRecording ? colors.error : colors.accent
                }
              ]}
            >
              <AppIcon icon={isRecording ? StopCircleIcon : Mic01Icon} color={colors.onAccent} size={44} />
            </Pressable>
            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              {isRecording ? `Recording… ${seconds}s / 60s` : 'Tap to record up to 60 seconds'}
            </Text>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            {uploading ? (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Uploading your recording…</Text>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={playerStatus.playing ? 'Pause playback' : 'Play recording'}
                  onPress={togglePlayback}
                  style={[styles.recordButton, { borderRadius: radius.pill, backgroundColor: colors.accent }]}
                >
                  <AppIcon
                    icon={playerStatus.playing ? PauseCircleIcon : PlayCircleIcon}
                    color={colors.onAccent}
                    size={44}
                  />
                </Pressable>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Recording saved</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleStartRecording();
                    }}
                    style={[styles.secondaryAction, { borderColor: colors.border, borderRadius: radius.pill }]}
                  >
                    <Text style={[styles.secondaryLabel, { color: colors.textPrimary }]}>Re-record</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleRemove();
                    }}
                    style={[styles.secondaryAction, { borderColor: colors.border, borderRadius: radius.pill }]}
                  >
                    <AppIcon icon={Delete02Icon} color={colors.error} size={16} />
                    <Text style={[styles.secondaryLabel, { color: colors.error }]}>Remove</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recordButton: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 14, textAlign: 'center' },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1
  },
  secondaryLabel: { fontSize: 13, fontWeight: '600' }
});
