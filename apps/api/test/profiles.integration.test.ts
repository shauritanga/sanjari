import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../src/profiles/storage.service';
import { VerificationService } from '../src/profiles/verification.service';

describe('profiles and verification integration contracts', () => {
  it('creates a scoped, expiring profile photo upload contract', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const service = new StorageService({
      getOrThrow: (key: string) => ({
        S3_BUCKET: 'sanjari',
        S3_ENDPOINT: 'http://minio:9000',
        S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY_ID: 'access',
        S3_SECRET_ACCESS_KEY: 'secret',
      })[key],
    } as never);
    (service as unknown as { client: { send: typeof send } }).client.send = send;
    const result = await service.presignProfilePhoto('user-1', 'image/jpeg');
    expect(result.storageKey).toMatch(/^profiles\/user-1\/.*\.jpeg$/);
    expect(result.uploadUrl).toContain('profiles/user-1/');
    expect(result.uploadUrl).not.toContain('storage.invalid');
    expect(result.expiresIn).toBe(300);
  });

  it('creates an auditable manual verification case without exposing artifacts', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'case-1',
      type: 'selfie_liveness',
      status: 'submitted',
      provider: 'manual_review',
      createdAt: new Date(),
    });
    const audit = vi.fn().mockResolvedValue({});
    const service = new VerificationService({
      verificationCase: { create },
      auditLog: { create: audit },
    } as never);
    const result = await service.request('user-1', 'selfie_liveness');
    expect(result).toMatchObject({ id: 'case-1', status: 'submitted', provider: 'manual_review' });
    expect(audit).toHaveBeenCalled();
  });

  it('rejects unknown verification types', async () => {
    const service = new VerificationService({} as never);
    await expect(service.request('user-1', 'unknown' as never)).rejects.toMatchObject({
      response: { code: 'INVALID_VERIFICATION_TYPE' },
    });
  });
});
