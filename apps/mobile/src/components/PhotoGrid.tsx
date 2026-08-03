import { Add01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { api } from '../api';
import { uploadBinaryFile } from '../upload';
import { useAppTheme } from '../theme/useAppTheme';

export interface PhotoItem {
  id: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: string;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  slots?: number;
}

export function PhotoGrid({ photos, onChange, slots = 6 }: PhotoGridProps) {
  const { colors, radius, spacing } = useAppTheme();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  async function pickAndUpload(position: number) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to add profile photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [3, 4]
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
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

  const cells = Array.from({ length: slots }, (_, index) => photos[index] ?? null);

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
            <>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accentAlt, borderRadius: radius.md }]} />
              {photo.moderationStatus === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <ActivityIndicator size="small" color={colors.onAccent} />
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
                <View style={[styles.primaryBadge, { backgroundColor: colors.accent }]} />
              ) : null}
            </>
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
    </View>
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
  primaryBadge: { position: 'absolute', bottom: 6, left: 6, width: 8, height: 8, borderRadius: 4 },
  pendingBadge: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' }
});
