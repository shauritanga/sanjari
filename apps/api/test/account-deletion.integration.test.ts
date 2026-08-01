import { describe, expect, it, vi } from 'vitest';
import { AccountDeletionService } from '../src/moderation/account-deletion.service';

describe('account deletion execution contract', () => {
  it('anonymizes due accounts, revokes access, removes profile data, and audits completion', async () => {
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      userCredential: { deleteMany: vi.fn().mockResolvedValue({}) },
      userSession: { deleteMany: vi.fn().mockResolvedValue({}) },
      userDevice: { deleteMany: vi.fn().mockResolvedValue({}) },
      profile: { deleteMany: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      accountDeletionRequest: { update: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      accountDeletionRequest: {
        findMany: vi.fn().mockResolvedValue([{ id: 'request-1', userId: 'user-1' }]),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const result = await new AccountDeletionService(prisma as never, undefined).process();

    expect(result).toEqual({ completed: 1 });
    expect(tx.user.update).toHaveBeenCalled();
    expect(tx.userSession.deleteMany).toHaveBeenCalled();
    expect(tx.profile.deleteMany).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(tx.accountDeletionRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'completed' } }),
    );
  });
});
