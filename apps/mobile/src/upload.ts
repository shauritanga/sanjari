import { File, UploadType } from 'expo-file-system';

export async function uploadBinaryFile(uri: string, uploadUrl: string, mimeType: string) {
  const result = await new File(uri).upload(uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': mimeType },
    mimeType,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}.`);
  }
}
