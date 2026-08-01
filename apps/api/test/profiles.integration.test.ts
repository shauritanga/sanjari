import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../src/profiles/storage.service';
import { VerificationService } from '../src/profiles/verification.service';

describe('profiles and verification integration contracts', () => {
  it('creates a scoped, expiring profile photo upload contract', () => {
    const result = new StorageService().presignProfilePhoto('user-1', 'image/jpeg');
    expect(result.storageKey).toMatch(/^profiles\/user-1\/.*\.jpeg$/);
    expect(result.uploadUrl).toContain(encodeURIComponent(result.storageKey));
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
