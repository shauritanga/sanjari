import {
  ArrowLeft01Icon,
  Contact01Icon,
  CrownIcon,
  EyeIcon,
  File01Icon,
  FileEditIcon,
  Location01Icon,
  LockPasswordIcon,
  Logout01Icon,
  Share08Icon,
  Shield01Icon,
  SmartPhone01Icon,
  TranslateIcon,
  UserBlock02Icon,
  UserGroupIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../src/components/AppIcon';
import { SearchableSelect, type SearchableSelectOption } from '../src/components/SearchableSelect';
import { ToggleRow } from '../src/components/ToggleRow';
import { api } from '../src/api';
import { useAppTheme, type AppTheme } from '../src/theme/useAppTheme';

interface Session {
  id: string;
  deviceId: string | null;
}

interface NotificationPreference {
  category: string;
  push: boolean;
  email: boolean;
  sms: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  matches: 'New matches',
  messages: 'Messages',
  likes: 'Likes you receive',
  promotions: 'News and offers'
};

const LANGUAGE_OPTIONS: SearchableSelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' }
];

const VISIBILITY_OPTIONS: SearchableSelectOption[] = [
  { value: 'everyone', label: 'Everyone', description: 'Your profile appears in Discover for all matching members.' },
  {
    value: 'liked_only',
    label: 'People I’ve liked',
    description: 'Only members you’ve already liked can see your profile in Discover.'
  }
];

const LANGUAGE_STORAGE_KEY = 'sanjari.language';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const { i18n } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [visibilityMode, setVisibilityModeState] = useState<'everyone' | 'liked_only'>('everyone');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [visibilityPickerOpen, setVisibilityPickerOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Session[]>('/auth/sessions'),
      api.get<NotificationPreference[]>('/notifications/preferences'),
      api.get<{ mode: 'everyone' | 'liked_only' | 'hidden' }>('/onboarding/visibility-mode')
    ])
      .then(([sessionsResult, preferencesResult, visibilityResult]) => {
        setSessions(sessionsResult.data ?? []);
        setPreferences(preferencesResult.data ?? []);
        if (visibilityResult.data?.mode === 'liked_only') setVisibilityModeState('liked_only');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  async function revokeSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
    try {
      await api.remove(`/auth/sessions/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out that device.');
    }
  }

  async function togglePush(category: string, value: boolean) {
    setPreferences((current) =>
      current.map((item) => (item.category === category ? { ...item, push: value } : item))
    );
    try {
      await api.post('/notifications/preferences', { category, push: value });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update notifications.');
    }
  }

  async function selectLanguage(value: string) {
    setLanguagePickerOpen(false);
    await i18n.changeLanguage(value);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  }

  async function selectVisibility(value: string) {
    setVisibilityPickerOpen(false);
    const mode = value === 'liked_only' ? 'liked_only' : 'everyone';
    setVisibilityModeState(mode);
    try {
      await api.put('/onboarding/visibility-mode', { mode });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update profile visibility.');
    }
  }

  async function shareProfile() {
    setSharing(true);
    setError('');
    try {
      const result = await api.post<{ token: string }>('/onboarding/share-link', {});
      const token = result.data?.token;
      if (!token) throw new Error('Unable to create a share link.');
      await Share.share({ message: `Check out my Sanjari profile: sanjari://profile/share/${token}` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to share your profile.');
    } finally {
      setSharing(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'You can log back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void api.logout().finally(() => setLoggingOut(false));
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topBarTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Section title="Personal information" theme={theme}>
            <SettingsRow
              icon={UserIcon}
              title="Name, phone, email & birthday"
              description="Manage the details that identify your account"
              onPress={() => router.push('/settings/personal-info')}
              theme={theme}
            />
          </Section>

          <Section title="Notifications" hint="Choose what sends you a push notification." theme={theme}>
            {preferences.map((preference) => (
              <ToggleRow
                key={preference.category}
                title={CATEGORY_LABELS[preference.category] ?? preference.category}
                value={preference.push}
                onChange={(value) => void togglePush(preference.category, value)}
              />
            ))}
          </Section>

          <Section title="App settings" theme={theme}>
            <SettingsRow
              icon={TranslateIcon}
              title="Language"
              description={i18n.language === 'sw' ? 'Kiswahili' : 'English'}
              onPress={() => setLanguagePickerOpen(true)}
              theme={theme}
            />
            <SettingsRow
              icon={LockPasswordIcon}
              title="Passcode lock"
              description="Require a passcode or biometrics to open Sanjari"
              onPress={() => router.push('/settings/passcode')}
              theme={theme}
            />
            <SettingsRow
              icon={UserGroupIcon}
              title="Chaperone"
              description="Loop in a trusted contact on your conversations"
              onPress={() => router.push('/settings/chaperone')}
              theme={theme}
            />
          </Section>

          <Section title="Privacy" theme={theme}>
            <SettingsRow
              icon={EyeIcon}
              title="Who can see my profile"
              description={visibilityMode === 'liked_only' ? 'People I’ve liked' : 'Everyone'}
              onPress={() => setVisibilityPickerOpen(true)}
              theme={theme}
            />
            <SettingsRow
              icon={Share08Icon}
              title={sharing ? 'Preparing link…' : 'Share my profile'}
              description="Send a link to your profile outside Sanjari"
              onPress={() => void shareProfile()}
              theme={theme}
            />
            <SettingsRow
              icon={UserBlock02Icon}
              title="Blocked profiles"
              description="Review and unblock members"
              onPress={() => router.push('/settings/blocked')}
              theme={theme}
            />
            <SettingsRow
              icon={Contact01Icon}
              title="Block my contacts"
              description="Avoid matching people already in your phone"
              onPress={() => router.push('/settings/contacts-block')}
              theme={theme}
            />
            <SettingsRow
              icon={Shield01Icon}
              title="Safety Centre"
              description="Guidance, appeals, data and account deletion"
              onPress={() => router.push('/safety')}
              theme={theme}
            />
          </Section>

          <Section title="Account" theme={theme}>
            <SettingsRow
              icon={CrownIcon}
              title="Membership"
              description="See who likes you, undo swipes and more"
              onPress={() => router.push('/premium')}
              theme={theme}
            />
            <SettingsRow
              icon={Location01Icon}
              title="Discovery preferences"
              description="Age range, distance and who you see"
              onPress={() => router.push('/filters')}
              theme={theme}
            />
            <SettingsRow
              icon={File01Icon}
              title="Terms of Service"
              description="How Sanjari expects members to behave"
              onPress={() => router.push('/settings/legal/terms')}
              theme={theme}
            />
            <SettingsRow
              icon={FileEditIcon}
              title="Privacy Policy"
              description="How your data is collected and used"
              onPress={() => router.push('/settings/legal/privacy-policy')}
              theme={theme}
            />
          </Section>

          <Section title="Devices" hint="Sign out of devices you don't recognize." theme={theme}>
            {sessions.length === 0 ? (
              <Text style={[staticStyles.emptyText, { color: colors.textSecondary }]}>No other active sessions.</Text>
            ) : (
              sessions.map((session) => (
                <View key={session.id} style={staticStyles.deviceRow}>
                  <View style={[staticStyles.deviceIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <AppIcon icon={SmartPhone01Icon} color={colors.accentAlt} size={18} />
                  </View>
                  <Text style={[staticStyles.deviceLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                    {session.deviceId ?? 'Unknown device'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign out this device"
                    onPress={() => void revokeSession(session.id)}
                    hitSlop={8}
                  >
                    <Text style={[staticStyles.deviceSignOut, { color: colors.error }]}>Sign out</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Section>

          <Pressable
            accessibilityRole="button"
            onPress={confirmLogout}
            disabled={loggingOut}
            style={[staticStyles.logoutRow, { borderColor: colors.error }]}
          >
            {loggingOut ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <AppIcon icon={Logout01Icon} color={colors.error} size={18} />
                <Text style={[staticStyles.logoutLabel, { color: colors.error }]}>Log out</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      <SearchableSelect
        visible={languagePickerOpen}
        title="Language"
        options={LANGUAGE_OPTIONS}
        selectedValue={i18n.language}
        onSelect={(value) => void selectLanguage(value)}
        onClose={() => setLanguagePickerOpen(false)}
      />
      <SearchableSelect
        visible={visibilityPickerOpen}
        title="Who can see my profile"
        options={VISIBILITY_OPTIONS}
        selectedValue={visibilityMode}
        onSelect={(value) => void selectVisibility(value)}
        onClose={() => setVisibilityPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  hint,
  theme,
  children
}: {
  title: string;
  hint?: string;
  theme: AppTheme;
  children: React.ReactNode;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <View
      style={[
        staticStyles.section,
        { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }
      ]}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.accentAlt, fontSize: 15, fontWeight: '800' }}>{title}</Text>
        {hint ? <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  onPress,
  theme
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  title: string;
  description: string;
  onPress: () => void;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={[staticStyles.rowIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
        <AppIcon icon={icon} color={colors.accentAlt} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{description}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 24, fontWeight: '300' }}>›</Text>
    </Pressable>
  );
}

const staticStyles = StyleSheet.create({
  section: { borderWidth: 1 },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  deviceLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  deviceSignOut: { fontSize: 13, fontWeight: '700' },
  emptyText: { fontSize: 13 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14
  },
  logoutLabel: { fontWeight: '700', fontSize: 15 }
});

function createStyles({ colors, spacing, typography }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm
    },
    topBarTitle: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    error: { color: colors.error, fontWeight: '600' }
  });
}
