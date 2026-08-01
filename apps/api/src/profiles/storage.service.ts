import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface PresignedUpload {
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  presignProfilePhoto(userId: string, mimeType: string): PresignedUpload {
    const extension = mimeType.split('/')[1];
    const storageKey = `profiles/${userId}/${randomUUID()}.${extension}`;
    return {
      storageKey,
      uploadUrl: `https://storage.invalid/upload/${encodeURIComponent(storageKey)}`,
      expiresIn: 300,
    };
  }
}
