import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  ImageUploadIcon,
  StarIcon
} from '@hugeicons/core-free-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { api } from '../api';
import { uploadBinaryFile } from '../upload';
import { useAppTheme } from '../theme/useAppTheme';

export interface PhotoItem {
  id: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: string;
  url?: string;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  slots?: number;
}

async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access needed', 'Allow photo library access to manage profile photos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: [3, 4]
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export function PhotoGrid({ photos, onChange, slots = 6 }: PhotoGridProps) {
  const theme = useAppTheme();
  const { colors, radius, spacing } = theme;
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [actionSheetPhoto, setActionSheetPhoto] = useState<PhotoItem | null>(null);

  async function pickAndUpload(position: number) {
    try {
      const asset = await pickImage();
      if (!asset) return;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      setUploadingSlot(position);
      const presign = await api.post<{ storageKey: string; uploadUrl: string }>('/onboarding/photos/presign', {
        mimeType,
        sizeBytes: asset.fileSize ?? 2_000_000
      });
      if (!presign.data) throw new Error('Unable to prepare upload.');
      await uploadBinaryFile(asset.uri, presign.data.uploadUrl, mimeType);
      const completed = await api.post<PhotoItem>('/onboarding/photos/complete', {
        storageKey: presign.data.storageKey
      });
      if (completed.data) onChange([...photos, completed.data]);
    } catch (cause) {
      Alert.alert('Upload failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setUploadingSlot(null);
    }
  }

  async function replacePhoto(photo: PhotoItem) {
    try {
      const asset = await pickImage();
      if (!asset) return;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      setBusyPhotoId(photo.id);
      const presign = await api.post<{ storageKey: string; uploadUrl: string }>('/onboarding/photos/presign', {
        mimeType,
        sizeBytes: asset.fileSize ?? 2_000_000
      });
      if (!presign.data) throw new Error('Unable to prepare upload.');
      await uploadBinaryFile(asset.uri, presign.data.uploadUrl, mimeType);
      const completed = await api.post<PhotoItem>(`/onboarding/photos/${photo.id}/replace`, {
        storageKey: presign.data.storageKey
      });
      if (completed.data) {
        onChange(photos.map((item) => (item.id === photo.id ? completed.data! : item)));
      }
    } catch (cause) {
      Alert.alert('Replace failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusyPhotoId(null);
    }
  }

  function removePhoto(photo: PhotoItem) {
    Alert.alert('Remove photo', 'This photo will be deleted from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void api.remove(`/onboarding/photos/${photo.id}`);
          onChange(photos.filter((item) => item.id !== photo.id));
        }
      }
    ]);
  }

  async function persistOrder(nextOrder: PhotoItem[]) {
    onChange(nextOrder.map((photo, index) => ({ ...photo, position: index, isPrimary: index === 0 })));
    try {
      await api.request('/onboarding/photos/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ photoIds: nextOrder.map((photo) => photo.id) })
      });
    } catch {
      // Best-effort — a failed reorder call just means the next screen load resyncs the true order.
    }
  }

  function movePhoto(photo: PhotoItem, direction: -1 | 1) {
    const index = photos.findIndex((item) => item.id === photo.id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= photos.length) return;
    const next = [...photos];
    const moved = next[index]!;
    next[index] = next[targetIndex]!;
    next[targetIndex] = moved;
    void persistOrder(next);
  }

  function setPrimary(photo: PhotoItem) {
    if (photo.isPrimary) return;
    const rest = photos.filter((item) => item.id !== photo.id);
    void persistOrder([photo, ...rest]);
  }

  const cells = Array.from({ length: slots }, (_, index) => photos[index] ?? null);
  const actionSheetIndex = actionSheetPhoto ? photos.findIndex((item) => item.id === actionSheetPhoto.id) : -1;

  return (
    <View style={[styles.grid, { gap: spacing.sm }]}>
      {cells.map((photo, index) => (
        <View
          key={photo?.id ?? `empty-${index}`}
          style={[
            styles.cell,
            {
              borderRadius: radius.md,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt
            }
          ]}
        >
          {photo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Photo options"
              onPress={() => setActionSheetPhoto(photo)}
              disabled={busyPhotoId === photo.id}
              style={StyleSheet.absoluteFill}
            >
              {photo.url ? (
                <Image
                  source={{ uri: photo.url }}
                  style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accentAlt, borderRadius: radius.md }]} />
              )}
              {busyPhotoId === photo.id ? (
                <View style={[StyleSheet.absoluteFill, styles.busyOverlay]}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
              {photo.moderationStatus === 'pending' || photo.moderationStatus === 'under_review' ? (
                <View style={[styles.statusPill, { backgroundColor: colors.overlay }]}>
                  <Text style={styles.statusPillText}>In review</Text>
                </View>
              ) : null}
              {photo.moderationStatus === 'rejected' || photo.moderationStatus === 'hidden' ? (
                <View style={[styles.statusPill, { backgroundColor: colors.error }]}>
                  <Text style={styles.statusPillText}>
                    {photo.moderationStatus === 'rejected' ? 'Rejected' : 'Hidden'}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={() => removePhoto(photo)}
                style={[styles.removeButton, { backgroundColor: colors.overlay }]}
                hitSlop={8}
              >
                <AppIcon icon={Cancel01Icon} color="#FFFFFF" size={14} />
              </Pressable>
              {photo.isPrimary ? (
                <View style={[styles.primaryBadge, { backgroundColor: colors.accent }]}>
                  <AppIcon icon={StarIcon} color="#FFFFFF" size={11} />
                </View>
              ) : null}
            </Pressable>
          ) : uploadingSlot === index ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              onPress={() => {
                void pickAndUpload(index);
              }}
              style={styles.addButton}
            >
              <AppIcon icon={Add01Icon} color={colors.textSecondary} size={24} />
            </Pressable>
          )}
        </View>
      ))}

      <Modal
        visible={actionSheetPhoto != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetPhoto(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActionSheetPhoto(null)} />
          {actionSheetPhoto ? (
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
            {!actionSheetPhoto.isPrimary ? (
              <SheetAction
                icon={StarIcon}
                label="Set as primary photo"
                onPress={() => {
                  setPrimary(actionSheetPhoto);
                  setActionSheetPhoto(null);
                }}
                theme={theme}
              />
            ) : null}
            <SheetAction
              icon={ImageUploadIcon}
              label="Replace photo"
              onPress={() => {
                setActionSheetPhoto(null);
                void replacePhoto(actionSheetPhoto);
              }}
              theme={theme}
            />
            {actionSheetIndex > 0 ? (
              <SheetAction
                icon={ArrowLeft01Icon}
                label="Move earlier"
                onPress={() => {
                  movePhoto(actionSheetPhoto, -1);
                  setActionSheetPhoto(null);
                }}
                theme={theme}
              />
            ) : null}
            {actionSheetIndex !== -1 && actionSheetIndex < photos.length - 1 ? (
              <SheetAction
                icon={ArrowRight01Icon}
                label="Move later"
                onPress={() => {
                  movePhoto(actionSheetPhoto, 1);
                  setActionSheetPhoto(null);
                }}
                theme={theme}
              />
            ) : null}
            <SheetAction
              icon={Cancel01Icon}
              label="Remove photo"
              destructive
              onPress={() => {
                setActionSheetPhoto(null);
                removePhoto(actionSheetPhoto);
              }}
              theme={theme}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setActionSheetPhoto(null)}
              style={styles.sheetCancel}
            >
              <Text style={[styles.sheetCancelLabel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
  destructive,
  theme
}: {
  icon: Parameters<typeof AppIcon>[0]['icon'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const { colors, spacing } = theme;
  const color = destructive ? colors.error : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.sheetAction, { gap: spacing.md, paddingVertical: spacing.md }]}
    >
      <AppIcon icon={icon} color={color} size={20} />
      <Text style={[styles.sheetActionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  addButton: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  busyOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: 'center'
  },
  statusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: { padding: 8, paddingBottom: 24, marginHorizontal: 12, marginBottom: 12 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  sheetActionLabel: { fontSize: 16, fontWeight: '600' },
  sheetCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  sheetCancelLabel: { fontSize: 16, fontWeight: '700' }
});
