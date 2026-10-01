import { describe, expect, it, vi } from 'vitest';
import { ProfilesService } from '../src/profiles/profiles.service';
import { StorageService } from '../src/profiles/storage.service';
import { VerificationService } from '../src/profiles/verification.service';

describe('profiles and verification integration contracts', () => {
  it('persists nationality, ethnicity, marital status, personality traits, and screenshot protection', async () => {
    const update = vi.fn().mockResolvedValue({
      interests: [],
      languages: [],
      photos: [],
    });
    const prisma = {
      profile: {
        findUnique: vi.fn().mockResolvedValue({
          onboardingStep: 1,
          onboardingStatus: 'in_progress',
          visibilitySettings: null,
          interests: [],
          languages: [],
          photos: [],
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          displayName: null,
          gender: null,
          interestedIn: [],
          relationshipIntentions: [],
          biography: null,
          city: null,
          interests: [],
          languages: [],
          photos: [],
        }),
        update,
      },
    };
    const service = new ProfilesService(prisma as never, {} as never, {} as never);

    await service.updateOnboarding('user-1', {
      nationalities: ['TZ', 'KE'],
      ethnicities: ['Bantu'],
      maritalStatus: 'never_married',
      personalityTraits: ['Adventurous', 'Empathetic'],
      screenshotProtectionEnabled: true,
    } as never);

    expect(update).toHaveBeenCalledTimes(2);
    const [callArgs] = update.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(callArgs.data).toMatchObject({
      nationalities: ['TZ', 'KE'],
      ethnicities: ['Bantu'],
      maritalStatus: 'never_married',
      personalityTraits: ['Adventurous', 'Empathetic'],
      screenshotProtectionEnabled: true,
    });
  });

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

  it('creates an auditable manual verification case with its uploaded artifact', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'case-1',
      type: 'selfie_liveness',
      status: 'submitted',
      provider: 'manual_review',
      createdAt: new Date(),
    });
    const artifactCreate = vi.fn().mockResolvedValue({});
    const audit = vi.fn().mockResolvedValue({});
    const tx = {
      verificationCase: { create },
      verificationArtifact: { create: artifactCreate },
      auditLog: { create: audit },
    };
    const service = new VerificationService(
      { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) } as never,
      {} as never,
    );
    const result = await service.request(
      'user-1',
      'selfie_liveness',
      'verification/user-1/selfie.jpg',
    );
    expect(result).toMatchObject({ id: 'case-1', status: 'submitted', provider: 'manual_review' });
    expect(artifactCreate).toHaveBeenCalledTimes(1);
    const [artifactArgs] = artifactCreate.mock.calls[0] as [{ data: { caseId: string; storageKey: string } }];
    expect(artifactArgs.data).toMatchObject({
      caseId: 'case-1',
      storageKey: 'verification/user-1/selfie.jpg',
    });
    expect(audit).toHaveBeenCalled();
  });

  it('rejects unknown verification types', async () => {
    const service = new VerificationService({} as never, {} as never);
    await expect(
      service.request('user-1', 'unknown' as never, 'verification/user-1/selfie.jpg'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_VERIFICATION_TYPE' },
    });
  });

  it('rejects artifacts uploaded to another account', async () => {
    const service = new VerificationService({} as never, {} as never);
    await expect(
      service.request('user-1', 'selfie_liveness', 'verification/someone-else/selfie.jpg'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_VERIFICATION_ARTIFACT' },
    });
  });
});
