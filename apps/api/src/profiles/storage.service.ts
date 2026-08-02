import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export interface PresignedUpload {
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;
  private ensureBucketPromise?: Promise<void>;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
    this.presignClient = new S3Client({
      endpoint: config.getOrThrow<string>('S3_PUBLIC_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async presign(userId: string, prefix: 'profiles' | 'messages', mimeType: string): Promise<PresignedUpload> {
    this.ensureBucketPromise ??= this.ensureBucket();
    await this.ensureBucketPromise;
    const extension = mimeType.split('/')[1] ?? 'bin';
    const storageKey = `${prefix}/${userId}/${randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      this.presignClient,
      new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, ContentType: mimeType }),
      { expiresIn: 300 },
    );
    return {
      storageKey,
      uploadUrl,
      expiresIn: 300,
    };
  }

  async presignProfilePhoto(userId: string, mimeType: string): Promise<PresignedUpload> {
    return this.presign(userId, 'profiles', mimeType);
  }
}
