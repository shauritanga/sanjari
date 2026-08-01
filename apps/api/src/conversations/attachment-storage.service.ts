import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AttachmentStorageService {
  presign(userId: string, mimeType: string) {
    const extension = mimeType.split('/')[1] ?? 'bin';
    const storageKey = `messages/${userId}/${randomUUID()}.${extension}`;
    return {
      storageKey,
      uploadUrl: `https://storage.invalid/upload/${encodeURIComponent(storageKey)}`,
      expiresIn: 300,
    };
  }
}
