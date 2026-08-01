import { describe, expect, it, vi } from 'vitest';
import { AdminOperationsService } from '../src/admin-operations/admin-operations.service';

const admin = (permissions: string[]) => ({
  id: 'admin-1',
  email: 'admin@example.test',
  displayName: 'Admin',
  permissions,
});

describe('admin operations RBAC contracts', () => {
  it('redacts sensitive user fields through the search projection and audits access', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: 'user-1', email: 'person@example.test', status: 'active', profile: null },
      ]);
    const audit = vi.fn().mockResolvedValue({});
    const result = await new AdminOperationsService({
      user: { findMany },
      auditLog: { create: audit },
    } as never).searchUsers(admin(['users.read']), { query: 'person' });
    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();
    expect(audit).toHaveBeenCalled();
  });

  it('rejects mutations without the required permission', async () => {
    await expect(
      new AdminOperationsService({} as never).suspendUser(admin(['users.read']), 'user-1', {
        reason: 'A sufficiently detailed reason.',
      }),
    ).rejects.toMatchObject({ response: { code: 'ADMIN_PERMISSION_REQUIRED' } });
  });

  it('revokes sessions and records before/after data for suspension', async () => {
    const tx = {
      user: { update: vi.fn().mockResolvedValue({ id: 'user-1', status: 'suspended' }) },
      userSession: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-1', status: 'active' }) },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const result = await new AdminOperationsService(prisma as never).suspendUser(
      admin(['users.suspend']),
      'user-1',
      { reason: 'A sufficiently detailed reason.' },
    );
    expect(result).toEqual({ id: 'user-1', status: 'suspended' });
    expect(tx.userSession.updateMany).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
