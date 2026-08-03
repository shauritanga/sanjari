import { describe, expect, it, vi } from 'vitest';
import { PhotoScanService } from '../src/profiles/photo-scan.service';

describe('photo scanning worker contract', () => {
  it('fails closed into under_review when no scanner provider is configured', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      profilePhoto: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'photo-1',
          storageKey: 'profiles/user-1/file.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        }),
        update,
      },
    };
    const result = await new PhotoScanService(
      prisma as never,
      { get: vi.fn().mockReturnValue(undefined) } as never,
    ).process('photo-1');
    expect(result).toEqual({ status: 'under_review' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { moderationStatus: 'under_review' } }),
    );
  });

  it('approves a locally scanned photo only when local mode is explicitly enabled', async () => {
    const prisma = {
      profilePhoto: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'photo-1',
          storageKey: 'profiles/user-1/file.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const result = await new PhotoScanService(
      prisma as never,
      { get: vi.fn().mockReturnValue('local') } as never,
    ).process('photo-1');
    expect(result).toEqual({ status: 'approved' });
  });

  it('does nothing when the photo no longer exists', async () => {
    const prisma = { profilePhoto: { findUnique: vi.fn().mockResolvedValue(null) } };
    const result = await new PhotoScanService(prisma as never, {} as never).process('missing');
    expect(result).toEqual({ status: 'missing' });
  });
});
