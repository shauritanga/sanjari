import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { ProgressBar } from './ProgressBar';
import { useAppTheme } from '../theme/useAppTheme';
import { TOTAL_ONBOARDING_STEPS } from '../onboarding/steps';

interface OnboardingScreenProps {
  step: number;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  onSkip?: () => void;
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  scroll?: boolean;
  /** Opt-in trial of react-native-keyboard-controller in place of the default KeyboardAvoidingView + ScrollView. */
  keyboardAware?: boolean;
  footerNote?: string;
}

export function OnboardingScreen(props: OnboardingScreenProps) {
  const { colors, spacing } = useAppTheme();
  const Content = props.scroll === false ? View : ScrollView;
  const contentProps =
    props.scroll === false
      ? { style: styles.flexContent }
      : { contentContainerStyle: styles.scrollContent, keyboardShouldPersistTaps: 'handled' as const };

  const header = (
    <View style={[styles.header, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
      <View style={styles.headerRow}>
        {props.hideBack ? (
          <View style={styles.backButton} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={props.onBack ?? (() => router.back())}
            style={styles.backButton}
            hitSlop={12}
          >
            <AppIcon icon={ArrowLeft01Icon} color={colors.textPrimary} size={22} />
          </Pressable>
        )}
        <View style={styles.progressWrap}>
          <ProgressBar current={props.step} total={TOTAL_ONBOARDING_STEPS} />
        </View>
        {props.onSkip ? (
          <Pressable accessibilityRole="button" onPress={props.onSkip} hitSlop={12}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>
    </View>
  );

  const body = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, flexGrow: 1 }}>
      {props.title ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.title, { color: colors.accentAlt }]}>{props.title}</Text>
          {props.subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{props.subtitle}</Text>
          ) : null}
        </View>
      ) : null}
      {props.children}
    </View>
  );

  const footer = (
    <View style={[styles.footer, { paddingHorizontal: spacing.lg, gap: spacing.sm, borderTopColor: colors.border }]}>
      {props.footerNote ? (
        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>{props.footerNote}</Text>
      ) : null}
      <AppButton
        label={props.primaryLabel}
        onPress={props.onPrimaryPress}
        disabled={props.primaryDisabled ?? false}
        loading={props.primaryLoading ?? false}
      />
      {props.secondaryLabel ? (
        <AppButton label={props.secondaryLabel} variant="ghost" onPress={props.onSecondaryPress ?? (() => {})} />
      ) : null}
    </View>
  );

  if (props.keyboardAware) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {header}
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </KeyboardAwareScrollView>
        {footer}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <Content {...contentProps}>{body}</Content>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  progressWrap: { flex: 1 },
  skip: { fontSize: 14, fontWeight: '600' },
  skipPlaceholder: { width: 32 },
  flexContent: { flex: 1, paddingTop: 12 },
  scrollContent: { flexGrow: 1, paddingTop: 12, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 21 },
  footer: { paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  footerNote: { fontSize: 12, textAlign: 'center' }
});
