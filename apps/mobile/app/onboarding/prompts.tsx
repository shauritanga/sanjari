import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

interface PromptOption {
  id: string;
  prompt: string;
  locale: string;
}

export default function PromptsScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const setPromptAnswers = useOnboardingStore((state) => state.setPromptAnswers);
  const storedAnswers = useOnboardingStore((state) => state.promptAnswers);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(storedAnswers.map((a) => a.promptId));
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(storedAnswers.map((a) => [a.promptId, a.answer]))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<PromptOption[]>('/onboarding/prompts?locale=en');
        if (!cancelled) setPrompts(result.data ?? []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load prompts.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  const selectedPrompts = prompts.filter((prompt) => selectedIds.includes(prompt.id));
  const readyCount = selectedPrompts.filter((prompt) => (answers[prompt.id]?.trim().length ?? 0) > 0).length;
  const isComplete = selectedIds.length === 3 && readyCount === 3;

  async function handlePrimary() {
    if (!isComplete) return;
    setSaving(true);
    setError(null);
    try {
      const payload = selectedIds.map((promptId) => ({ promptId, answer: (answers[promptId] ?? '').trim() }));
      await setPromptAnswers(payload);
      router.push('/onboarding/languages');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your prompts.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('prompts')}
      title="Answer a few prompts"
      subtitle="Pick 3 prompts and share your answer — this is prime real estate on your profile."
      primaryLabel="Continue"
      primaryDisabled={!isComplete}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
      footerNote={error ?? `${selectedIds.length}/3 prompts selected`}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {prompts.map((prompt) => {
            const active = selectedIds.includes(prompt.id);
            const disabled = !active && selectedIds.length >= 3;
            return (
              <Pressable
                key={prompt.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                disabled={disabled}
                onPress={() => toggle(prompt.id)}
                style={[
                  styles.row,
                  {
                    borderRadius: radius.lg,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.surfaceAlt : colors.surface,
                    padding: spacing.md,
                    opacity: disabled ? 0.5 : 1
                  }
                ]}
              >
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{prompt.prompt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {selectedPrompts.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          {selectedPrompts.map((prompt) => (
            <AppTextInput
              key={prompt.id}
              label={prompt.prompt}
              value={answers[prompt.id] ?? ''}
              onChangeText={(text) => setAnswers((current) => ({ ...current, [prompt.id]: text }))}
              multiline
              maxLength={300}
              placeholder="Your answer..."
            />
          ))}
        </View>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  row: { borderWidth: 1.5 },
  rowLabel: { fontSize: 15, fontWeight: '600' }
});
