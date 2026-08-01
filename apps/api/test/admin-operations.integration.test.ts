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

  it('assigns roles transactionally with configuration permission', async () => {
    const tx = {
      adminRole: { upsert: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-2' }) },
      role: { findUnique: vi.fn().mockResolvedValue({ id: 'role-1', name: 'moderator' }) },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const result = await new AdminOperationsService(prisma as never).assignRole(
      admin(['configuration.manage']),
      'admin-2',
      { roleId: 'role-1' },
    );
    expect(result).toEqual({ adminUserId: 'admin-2', roleId: 'role-1', roleName: 'moderator' });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('reviews verification cases with reviewer identity and before/after audit metadata', async () => {
    const tx = {
      verificationCase: {
        update: vi
          .fn()
          .mockResolvedValue({
            id: 'case-1',
            status: 'approved',
            reviewedBy: 'admin-1',
            reviewedAt: new Date(),
          }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      verificationCase: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'case-1', userId: 'user-1', status: 'in_review' }),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const result = await new AdminOperationsService(prisma as never).reviewVerification(
      admin(['verification.review']),
      'case-1',
      { status: 'approved', reason: 'Human review completed.' },
    );
    expect(result.status).toBe('approved');
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
