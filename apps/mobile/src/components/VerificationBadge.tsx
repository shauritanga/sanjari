import { CheckmarkBadge01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useAppTheme, type AppTheme } from '../theme/useAppTheme';

const VERIFIED_BLUE = '#2F6FED';

export interface VerificationFlags {
  photoVerified: boolean;
  ageVerified: boolean;
  idVerified: boolean;
}

interface VerificationBadgeProps extends VerificationFlags {
  displayName: string;
  /** 'overlay' sits on top of a photo (white unverified icon); 'surface' sits on a card/background (gray unverified icon). */
  tone?: 'overlay' | 'surface';
  size?: number;
}

/** Small tappable badge cluster shown next to a name; opens the verification checklist modal. */
export function VerificationBadge({
  displayName,
  photoVerified,
  ageVerified,
  idVerified,
  tone = 'surface',
  size = 18
}: VerificationBadgeProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const anyVerified = photoVerified || ageVerified || idVerified;
  const fullyVerified = photoVerified && ageVerified && idVerified;
  const unverifiedColor = tone === 'overlay' ? 'rgba(255,255,255,0.85)' : theme.colors.border;

  if (!anyVerified) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View verification badges"
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={styles.trigger}
      >
        {fullyVerified ? (
          <View style={styles.cluster}>
            <AppIcon icon={CheckmarkBadge01Icon} color={tone === 'overlay' ? '#FFFFFF' : theme.colors.surface} size={size} />
            <View style={{ marginLeft: -size * 0.45 }}>
              <AppIcon icon={CheckmarkBadge01Icon} color={VERIFIED_BLUE} size={size} />
            </View>
          </View>
        ) : (
          <AppIcon icon={CheckmarkBadge01Icon} color={VERIFIED_BLUE} size={size} />
        )}
      </Pressable>

      <VerificationBadgesModal
        visible={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
        photoVerified={photoVerified}
        ageVerified={ageVerified}
        idVerified={idVerified}
        unverifiedColor={unverifiedColor}
        theme={theme}
      />
    </>
  );
}

function VerificationBadgesModal({
  visible,
  onClose,
  displayName,
  photoVerified,
  ageVerified,
  idVerified,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  photoVerified: boolean;
  ageVerified: boolean;
  idVerified: boolean;
  unverifiedColor: string;
  theme: AppTheme;
}) {
  const { colors, radius, spacing } = theme;
  const name = displayName || 'This member';

  const rows = [
    {
      key: 'photo',
      title: 'Photo Verification',
      verified: photoVerified,
      description: photoVerified
        ? `We have verified ${name}'s main photo by comparing their face scan to their main photo to verify that they match.`
        : `We have not verified ${name}'s main photo yet.`
    },
    {
      key: 'age',
      title: 'Age Verification',
      verified: ageVerified,
      description: ageVerified
        ? `${name}'s age has been verified after proving their date of birth matches their ID.`
        : `Members' age are verified after proving their age, with evidence of ID. We have not verified ${name}'s age yet.`
    },
    {
      key: 'id',
      title: 'ID Verification',
      verified: idVerified,
      description: idVerified
        ? `We have verified ${name}'s ID documents and can confirm their identity.`
        : `We can validate members' ID documents through a third party and can confirm their identity. We have not verified ${name}'s ID yet.`
    }
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Verification Badges</Text>

          <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <AppIcon
                  icon={CheckmarkBadge01Icon}
                  color={row.verified ? VERIFIED_BLUE : colors.border}
                  size={26}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{row.title}</Text>
                  <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{row.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.confirmButton, { backgroundColor: colors.accent, borderRadius: radius.pill, marginTop: spacing.lg }]}
          >
            <Text style={styles.confirmLabel}>Ok, got it!</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: { alignItems: 'center', justifyContent: 'center' },
  cluster: { flexDirection: 'row', alignItems: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  sheet: { width: '100%', maxWidth: 420 },
  sheetTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowDescription: { fontSize: 13, lineHeight: 19 },
  confirmButton: { height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});
