import {
  ArrowLeft01Icon,
  Calendar03Icon,
  Call02Icon,
  MailAtSign01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { AppIcon } from '../../src/components/AppIcon';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { useAppTheme, type AppTheme } from '../../src/theme/useAppTheme';

interface PersonalInfo {
  displayName: string | null;
  gender: string | null;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PersonalInfoScreen() {
  const theme = useAppTheme();
  const { colors, spacing, typography } = theme;
  const [info, setInfo] = useState<PersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneFlow, setPhoneFlow] = useState<'idle' | 'enter' | 'code'>('idle');
  const [emailFlow, setEmailFlow] = useState<'idle' | 'enter' | 'code'>('idle');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .get<{ email: string; phoneNumber: string | null; dateOfBirth: string; profile: { displayName: string | null; gender: string | null } }>(
        '/onboarding',
      )
      .then((result) => {
        if (result.data) {
          setInfo({
            email: result.data.email,
            phoneNumber: result.data.phoneNumber,
            dateOfBirth: result.data.dateOfBirth,
            displayName: result.data.profile.displayName,
            gender: result.data.profile.gender,
          });
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load your details.'))
      .finally(() => setLoading(false));
  }, []);

  async function requestPhoneChange() {
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/phone/request', { phoneNumber: phoneInput });
      setPhoneFlow('code');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a verification code.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmPhoneChange() {
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/phone/verify', { phoneNumber: phoneInput, code: phoneCode });
      setInfo((current) => (current ? { ...current, phoneNumber: phoneInput } : current));
      setNotice('Phone number updated.');
      setPhoneFlow('idle');
      setPhoneInput('');
      setPhoneCode('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That code is invalid or expired.');
    } finally {
      setBusy(false);
    }
  }

  async function requestEmailChange() {
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/email/change/request', { newEmail: emailInput });
      setEmailFlow('code');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a verification code.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmailChange() {
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{ email: string }>('/auth/email/change/confirm', {
        newEmail: emailInput,
        code: emailCode,
      });
      setInfo((current) => (current && result.data ? { ...current, email: result.data.email } : current));
      setNotice('Email address updated.');
      setEmailFlow('idle');
      setEmailInput('');
      setEmailCode('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That code is invalid or expired.');
    } finally {
      setBusy(false);
    }
  }

  const styles = createStyles(theme);

  if (loading || !info) {
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
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.h3.fontSize }]}>Personal information</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}

        <Row icon={UserIcon} theme={theme} label="Name & gender" value={info.displayName ? `${info.displayName}${info.gender ? ` · ${info.gender}` : ''}` : 'Add your details'} onPress={() => router.push('/profile/edit')} />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowHeader icon={Call02Icon} theme={theme} label="Phone number" value={info.phoneNumber ?? 'Not set'} />
          {phoneFlow === 'idle' ? (
            <AppButton
              label={info.phoneNumber ? 'Change phone number' : 'Add phone number'}
              variant="secondary"
              onPress={() => {
                setPhoneFlow('enter');
                setPhoneInput('');
                setError('');
                setNotice('');
              }}
            />
          ) : null}
          {phoneFlow === 'enter' ? (
            <View style={{ gap: spacing.sm }}>
              <AppTextInput
                label="New phone number"
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="+255700000000"
                keyboardType="phone-pad"
              />
              <AppButton label="Send code" onPress={() => void requestPhoneChange()} loading={busy} disabled={phoneInput.trim().length < 8} />
            </View>
          ) : null}
          {phoneFlow === 'code' ? (
            <View style={{ gap: spacing.sm }}>
              <AppTextInput label="Verification code" value={phoneCode} onChangeText={setPhoneCode} keyboardType="number-pad" maxLength={6} />
              <AppButton label="Confirm" onPress={() => void confirmPhoneChange()} loading={busy} disabled={phoneCode.length < 4} />
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowHeader icon={MailAtSign01Icon} theme={theme} label="Email address" value={info.email} />
          {emailFlow === 'idle' ? (
            <AppButton
              label="Change email address"
              variant="secondary"
              onPress={() => {
                setEmailFlow('enter');
                setEmailInput('');
                setError('');
                setNotice('');
              }}
            />
          ) : null}
          {emailFlow === 'enter' ? (
            <View style={{ gap: spacing.sm }}>
              <AppTextInput
                label="New email address"
                value={emailInput}
                onChangeText={setEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AppButton label="Send code" onPress={() => void requestEmailChange()} loading={busy} disabled={!emailInput.includes('@')} />
            </View>
          ) : null}
          {emailFlow === 'code' ? (
            <View style={{ gap: spacing.sm }}>
              <AppTextInput label="Verification code" value={emailCode} onChangeText={setEmailCode} keyboardType="number-pad" maxLength={6} />
              <AppButton label="Confirm" onPress={() => void confirmEmailChange()} loading={busy} disabled={emailCode.length < 4} />
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RowHeader icon={Calendar03Icon} theme={theme} label="Date of birth" value={formatDate(info.dateOfBirth)} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
            Your date of birth confirms your age to other members and can't be changed here. Contact support if it's incorrect.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RowHeader({
  icon,
  label,
  value,
  theme,
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  label: string;
  value: string;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={[localStyles.rowIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
        <AppIcon icon={icon} color={colors.accentAlt} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  theme,
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  label: string;
  value: string;
  onPress: () => void;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        localStyles.card,
        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
      ]}
    >
      <View style={[localStyles.rowIcon, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
        <AppIcon icon={icon} color={colors.accentAlt} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 24, fontWeight: '300' }}>›</Text>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  card: { borderWidth: 1 },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

function createStyles({ colors, spacing, radius }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    title: { fontWeight: '700' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingBottom: 48 },
    card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
    error: { color: colors.error, fontWeight: '600' },
    notice: { fontWeight: '600' },
  });
}
