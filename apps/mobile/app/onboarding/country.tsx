import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useOnboardingStore } from '../../src/store/onboarding';
import { stepNumber } from '../../src/onboarding/steps';

interface CountryOption {
  code: string;
  name: string;
  cities: { id: string; name: string }[];
}

export default function CountryScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const storedCountryCode = useOnboardingStore((state) => state.countryCode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>(storedCountryCode ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<CountryOption[]>('/catalog/locations');
        if (!cancelled) setCountries(result.data ?? []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load countries.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return countries;
    return countries.filter((country) => country.name.toLowerCase().includes(normalized));
  }, [countries, query]);

  async function handlePrimary() {
    if (!selectedCode) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ countryCode: selectedCode }, stepNumber('country'));
      router.push({ pathname: '/onboarding/city', params: { countryCode: selectedCode } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your country.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('country')}
      title="Where are you based?"
      subtitle="This helps us find matches near you."
      primaryLabel="Continue"
      primaryDisabled={!selectedCode}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      <AppTextInput
        label="Search countries"
        value={query}
        onChangeText={setQuery}
        placeholder="Type a country name"
        autoCapitalize="words"
      />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filtered.map((country) => {
            const active = country.code === selectedCode;
            return (
              <Pressable
                key={country.code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedCode(country.code)}
                style={[
                  styles.row,
                  {
                    borderRadius: radius.lg,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.surfaceAlt : colors.surface,
                    padding: spacing.md
                  }
                ]}
              >
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{country.name}</Text>
              </Pressable>
            );
          })}
          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No countries match your search.</Text>
          ) : null}
        </View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  error: { fontSize: 14 },
  row: { borderWidth: 1.5 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 16 }
});
