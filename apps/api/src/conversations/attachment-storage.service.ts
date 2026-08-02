import { Injectable } from '@nestjs/common';
import { StorageService } from '../profiles/storage.service';

@Injectable()
export class AttachmentStorageService {
  constructor(private readonly storage: StorageService) {}

  presign(userId: string, mimeType: string) {
    return this.storage.presign(userId, 'messages', mimeType);
  }
}
