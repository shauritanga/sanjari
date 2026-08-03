import { describe, expect, it, vi } from 'vitest';
import { DiscoveryService } from '../src/discovery/discovery.service';

describe('discovery and matching integration contracts', () => {
  it('rejects self-interactions before persistence', async () => {
    const service = new DiscoveryService({} as never, {} as never, {} as never);
    await expect(service.like('user-1', 'user-1', {})).rejects.toMatchObject({
      response: { code: 'SELF_ACTION_NOT_ALLOWED' },
    });
  });

  it('creates a match only after a reciprocal like', async () => {
    const matchUpsert = vi.fn().mockResolvedValue({ id: 'match-1' });
    const tx = {
      discoveryDailyUsage: { upsert: vi.fn().mockResolvedValue({ count: 1 }) },
      discoveryAction: { create: vi.fn().mockResolvedValue({}) },
      like: {
        upsert: vi.fn().mockResolvedValue({ id: 'like-1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'reciprocal' }),
      },
      match: { upsert: matchUpsert },
      conversation: { upsert: vi.fn().mockResolvedValue({ id: 'conversation-1' }) },
      recommendation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-2',
          status: 'active',
          profile: { displayName: 'Asha', photos: [] },
        }),
      },
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    const result = await new DiscoveryService(prisma as never, {} as never, {} as never).like(
      'user-1',
      'user-2',
      {},
    );
    expect(result).toMatchObject({
      liked: true,
      matched: true,
      matchId: 'match-1',
      conversationId: 'conversation-1',
    });
    expect(matchUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userAId_userBId: { userAId: 'user-1', userBId: 'user-2' } },
      }),
    );
  });

  it('persists a pass with its idempotency key', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const tx = {
      discoveryDailyUsage: { upsert: vi.fn().mockResolvedValue({ count: 1 }) },
      discoveryAction: { create: vi.fn().mockResolvedValue({}) },
      pass: { upsert },
      recommendation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      discoveryAction: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    await new DiscoveryService(prisma as never, {} as never, {} as never).pass('user-1', 'user-2', 'pass-1');
    expect(upsert).toHaveBeenCalled();
  });

  it('rejects a pass after the daily limit is reached', async () => {
    const tx = { discoveryDailyUsage: { upsert: vi.fn().mockResolvedValue({ count: 201 }) } };
    const prisma = {
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    await expect(
      new DiscoveryService(prisma as never, {} as never, {} as never).pass('user-1', 'user-2'),
    ).rejects.toMatchObject({ response: { code: 'DAILY_ACTION_LIMIT' } });
  });

  it('requires a server entitlement before undoing a recent pass', async () => {
    const tx = {
      pass: { deleteMany: vi.fn() },
      discoveryAction: { update: vi.fn() },
      recommendation: { updateMany: vi.fn() },
    };
    const prisma = {
      discoveryAction: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'action-1', action: 'pass', targetUserId: 'user-2' }),
      },
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    const withoutEntitlement = new DiscoveryService(
      prisma as never,
      { canUndo: vi.fn().mockResolvedValue(false) } as never,
      {} as never,
    );
    await expect(withoutEntitlement.undo('user-1')).rejects.toMatchObject({
      response: { code: 'UNDO_ENTITLEMENT_REQUIRED' },
    });
    const withEntitlement = new DiscoveryService(
      prisma as never,
      { canUndo: vi.fn().mockResolvedValue(true) } as never,
      {} as never,
    );
    await expect(withEntitlement.undo('user-1')).resolves.toMatchObject({
      undone: true,
      targetUserId: 'user-2',
    });
  });
});
