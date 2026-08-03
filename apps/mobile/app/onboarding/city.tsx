import { router, useLocalSearchParams } from 'expo-router';
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

interface CityOption {
  id: string;
  name: string;
}

export default function CityScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const params = useLocalSearchParams<{ countryCode?: string }>();
  const storeCountryCode = useOnboardingStore((state) => state.countryCode);
  const saveOnboarding = useOnboardingStore((state) => state.saveOnboarding);
  const countryCode = params.countryCode ?? storeCountryCode;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<CountryOption[]>('/catalog/locations');
        if (cancelled) return;
        const match = (result.data ?? []).find((country) => country.code === countryCode);
        setCities(match?.cities ?? []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load cities.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cities;
    return cities.filter((city) => city.name.toLowerCase().includes(normalized));
  }, [cities, query]);

  async function handlePrimary() {
    if (!selectedCity) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({ cityId: selectedCity.id, city: selectedCity.name }, stepNumber('city'));
      router.push('/onboarding/bio');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your city.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={stepNumber('city')}
      title="Which city?"
      subtitle="Pin down your city so we can surface nearby matches."
      primaryLabel="Continue"
      primaryDisabled={!selectedCity}
      primaryLoading={saving}
      onPrimaryPress={() => {
        void handlePrimary();
      }}
    >
      {!countryCode ? (
        <Text style={[styles.error, { color: colors.error }]}>
          We couldn't tell which country you picked. Go back and choose one.
        </Text>
      ) : (
        <>
          <AppTextInput
            label="Search cities"
            value={query}
            onChangeText={setQuery}
            placeholder="Type a city name"
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
              {filtered.map((city) => {
                const active = city.id === selectedCity?.id;
                return (
                  <Pressable
                    key={city.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedCity(city)}
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
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{city.name}</Text>
                  </Pressable>
                );
              })}
              {filtered.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>No cities match your search.</Text>
              ) : null}
            </View>
          )}
        </>
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
