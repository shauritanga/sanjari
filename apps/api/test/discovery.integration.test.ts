import { describe, expect, it, vi } from 'vitest';
import { DiscoveryService } from '../src/discovery/discovery.service';

describe('discovery and matching integration contracts', () => {
  it('rejects self-interactions before persistence', async () => {
    const service = new DiscoveryService({} as never);
    await expect(service.like('user-1', 'user-1', {})).rejects.toMatchObject({
      response: { code: 'SELF_ACTION_NOT_ALLOWED' },
    });
  });

  it('creates a match only after a reciprocal like', async () => {
    const matchUpsert = vi.fn().mockResolvedValue({ id: 'match-1' });
    const tx = {
      like: {
        upsert: vi.fn().mockResolvedValue({ id: 'like-1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'reciprocal' }),
      },
      match: { upsert: matchUpsert },
      recommendation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-2', status: 'active' }) },
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    const result = await new DiscoveryService(prisma as never).like('user-1', 'user-2', {});
    expect(result).toMatchObject({ liked: true, matched: true, matchId: 'match-1' });
    expect(matchUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userAId_userBId: { userAId: 'user-1', userBId: 'user-2' } },
      }),
    );
  });

  it('persists a pass with its idempotency key', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      pass: { upsert },
      recommendation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    await new DiscoveryService(prisma as never).pass('user-1', 'user-2', 'pass-1');
    expect(upsert).toHaveBeenCalled();
  });
});
