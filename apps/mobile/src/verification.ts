import * as ImagePicker from 'expo-image-picker';
import { api } from './api';
import { uploadBinaryFile } from './upload';

export type VerificationType = 'selfie_liveness' | 'identity_document';

export interface VerificationCase {
  id: string;
  type: VerificationType;
  status: string;
  provider: string;
  confidence?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Opens the camera (front-facing for a selfie check, back-facing for an ID
 * document), then presigns, uploads, and submits the captured photo as a
 * verification artifact. Returns null if the user cancels or denies camera
 * access without submitting anything.
 */
export async function captureAndSubmitVerification(
  type: VerificationType
): Promise<VerificationCase | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera access is needed to complete verification.');
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    cameraType: type === 'selfie_liveness' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    allowsEditing: false
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';

  const presign = await api.post<{ storageKey: string; uploadUrl: string }>(
    `/onboarding/verification/${type}/presign`,
    { mimeType, sizeBytes: asset.fileSize ?? 2_000_000 }
  );
  if (!presign.data) throw new Error('Unable to prepare upload.');
  await uploadBinaryFile(asset.uri, presign.data.uploadUrl, mimeType);
  const completed = await api.post<VerificationCase>(`/onboarding/verification/${type}/request`, {
    storageKey: presign.data.storageKey
  });
  if (!completed.data) throw new Error('Unable to submit verification.');
  return completed.data;
}
