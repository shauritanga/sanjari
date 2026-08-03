import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { AppIcon } from '../src/components/AppIcon';
import { ChipGroup } from '../src/components/ChipGroup';
import { Stepper } from '../src/components/Stepper';
import { ToggleRow } from '../src/components/ToggleRow';
import { api } from '../src/api';
import {
  INTENTION_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  WHO_TO_MEET_OPTIONS
} from '../src/onboarding/options';
import { useDiscoveryFiltersStore } from '../src/store/discoveryFilters';
import { useAppTheme } from '../src/theme/useAppTheme';

interface DiscoveryPreference {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  genders: string[];
  intentions: string[];
  languages: string[];
  interests: string[];
  verifiedOnly: boolean;
  showDistance: boolean;
}

const DEFAULT_PREFERENCE: DiscoveryPreference = {
  minAge: 18,
  maxAge: 80,
  maxDistanceKm: 50,
  genders: [],
  intentions: [],
  languages: [],
  interests: [],
  verifiedOnly: false,
  showDistance: true
};

export default function FiltersScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const recentlyActive = useDiscoveryFiltersStore((state) => state.recentlyActive);
  const newMembers = useDiscoveryFiltersStore((state) => state.newMembers);
  const setRecentlyActive = useDiscoveryFiltersStore((state) => state.setRecentlyActive);
  const setNewMembers = useDiscoveryFiltersStore((state) => state.setNewMembers);

  const [preference, setPreference] = useState<DiscoveryPreference>(DEFAULT_PREFERENCE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api
      .get<DiscoveryPreference>('/onboarding/discovery-preferences')
      .then((result) => {
        if (cancelled) return;
        if (result.data) setPreference({ ...DEFAULT_PREFERENCE, ...result.data });
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load filters.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function changeMinAge(value: number) {
    setPreference((current) => ({
      ...current,
      minAge: value,
      maxAge: value > current.maxAge ? value : current.maxAge
    }));
  }

  function changeMaxAge(value: number) {
    setPreference((current) => ({
      ...current,
      maxAge: value,
      minAge: value < current.minAge ? value : current.minAge
    }));
  }

  async function applyFilters() {
    setSaving(true);
    setError('');
    try {
      await api.put('/onboarding/discovery-preferences', preference);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your filters.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surfaceAlt }]}
          hitSlop={8}
        >
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={20} />
        </Pressable>
        <Text
          style={{
            color: colors.accentAlt,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight
          }}
        >
          Filters
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}
            keyboardShouldPersistTaps="handled"
          >
            {error ? <Text style={{ color: colors.error, fontWeight: '600' }}>{error}</Text> : null}

            <Section title="Age range" hint="Show people within this age range.">
              <Stepper label="Minimum age" value={preference.minAge} min={18} max={99} onChange={changeMinAge} />
              <Stepper label="Maximum age" value={preference.maxAge} min={18} max={100} onChange={changeMaxAge} />
            </Section>

            <Section title="Distance" hint="Widen your radius to see more people.">
              <Stepper
                label="Maximum distance"
                value={preference.maxDistanceKm}
                min={1}
                max={500}
                step={5}
                suffix="km"
                onChange={(value) => setPreference((current) => ({ ...current, maxDistanceKm: value }))}
              />
            </Section>

            <Section title="Show me" hint="Choose who appears in your discovery feed.">
              <ChipGroup
                options={WHO_TO_MEET_OPTIONS}
                selected={preference.genders}
                onChange={(next) => setPreference((current) => ({ ...current, genders: next }))}
              />
            </Section>

            <Section title="Relationship intentions" hint="Pick up to 3 that describe what you're open to.">
              <ChipGroup
                options={INTENTION_OPTIONS}
                selected={preference.intentions}
                onChange={(next) => setPreference((current) => ({ ...current, intentions: next }))}
                max={3}
              />
            </Section>

            <Section title="Languages" hint="Match with people who share your languages.">
              <ChipGroup
                options={LANGUAGE_OPTIONS}
                selected={preference.languages}
                onChange={(next) => setPreference((current) => ({ ...current, languages: next }))}
                max={10}
              />
            </Section>

            <Section title="Interests" hint="We'll prioritize people who share these.">
              <ChipGroup
                options={INTEREST_OPTIONS}
                selected={preference.interests}
                onChange={(next) => setPreference((current) => ({ ...current, interests: next }))}
                max={20}
              />
            </Section>

            <Section title="Preferences" hint="Fine-tune the profiles you see.">
              <ToggleRow
                title="Verified profiles only"
                description="Only show members who have completed identity verification."
                value={preference.verifiedOnly}
                onChange={(value) => setPreference((current) => ({ ...current, verifiedOnly: value }))}
              />
              <ToggleRow
                title="Show my distance to others"
                value={preference.showDistance}
                onChange={(value) => setPreference((current) => ({ ...current, showDistance: value }))}
              />
              <ToggleRow
                title="Recently active only"
                description="Only show members who have used Sanjari recently."
                value={recentlyActive}
                onChange={setRecentlyActive}
              />
              <ToggleRow
                title="New members only"
                description="Only show members who joined recently."
                value={newMembers}
                onChange={setNewMembers}
              />
            </Section>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { padding: spacing.lg, backgroundColor: colors.background, borderTopColor: colors.border }
            ]}
          >
            <AppButton
              label={saving ? 'Applying...' : 'Apply filters'}
              loading={saving}
              onPress={() => {
                void applyFilters();
              }}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.section,
        {
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md
        }
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.accentAlt, fontSize: 18, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {},
  section: { borderWidth: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth }
});
