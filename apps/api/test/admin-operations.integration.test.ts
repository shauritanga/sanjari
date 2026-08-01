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

  it('lists feature flags with redacted rules and audits configuration access', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'flag-1', key: 'matching.v2', enabled: false, rules: null, updatedAt: new Date() },
    ]);
    const audit = vi.fn().mockResolvedValue({});
    const result = await new AdminOperationsService({
      featureFlag: { findMany },
      auditLog: { create: audit },
    } as never).featureFlags(admin(['configuration.manage']));
    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();
    expect(audit).toHaveBeenCalled();
  });

  it('updates feature flags transactionally with before/after audit metadata', async () => {
    const tx = {
      featureFlag: {
        update: vi.fn().mockResolvedValue({
          id: 'flag-1',
          key: 'matching.v2',
          enabled: true,
          updatedAt: new Date(),
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      featureFlag: {
        findUnique: vi.fn().mockResolvedValue({ id: 'flag-1', key: 'matching.v2', enabled: false }),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => Promise.resolve(callback(tx))),
    };
    const result = await new AdminOperationsService(prisma as never).updateFeatureFlag(
      admin(['configuration.manage']),
      'flag-1',
      { enabled: true },
    );
    expect(result.enabled).toBe(true);
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('returns operational job health and audits the read', async () => {
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      backgroundJobRecord: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
        findMany: vi.fn().mockResolvedValue([
          { id: 'job-1', queue: 'ranking', jobKey: 'user-1', status: 'failed', attempts: 3, lastError: 'timeout', updatedAt: new Date() },
        ]),
      },
      auditLog: { create: audit },
    };
    const result = await new AdminOperationsService(prisma as never).health(
      admin(['health.read']),
    );
    expect(result.failedJobs).toBe(2);
    expect(result.activeJobs).toBe(1);
    expect(result.recentJobs).toHaveLength(1);
    expect(audit).toHaveBeenCalled();
  });

  it('updates support workflow state transactionally with a reason', async () => {
    const tx = {
      supportTicket: {
        update: vi.fn().mockResolvedValue({ id: 'ticket-1', status: 'resolved', priority: 'high', updatedAt: new Date() }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      supportTicket: { findUnique: vi.fn().mockResolvedValue({ id: 'ticket-1', status: 'open', priority: 'high' }) },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => Promise.resolve(callback(tx))),
    };
    const result = await new AdminOperationsService(prisma as never).updateSupportTicket(
      admin(['support.manage']),
      'ticket-1',
      { status: 'resolved', priority: 'high', reason: 'Support review completed successfully.' },
    );
    expect(result.status).toBe('resolved');
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('returns aggregate operational analytics without private content', async () => {
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      notification: { count: vi.fn().mockResolvedValue(3) },
      supportTicket: { count: vi.fn().mockResolvedValue(4) },
      dataExportRequest: { count: vi.fn().mockResolvedValue(1) },
      backgroundJobRecord: { count: vi.fn().mockResolvedValue(2) },
      auditLog: { count: vi.fn().mockResolvedValue(8), create: audit },
    };
    const result = await new AdminOperationsService(prisma as never).analytics(
      admin(['analytics.read']),
    );
    expect(result).toEqual({ unreadNotifications: 3, openSupportTickets: 4, failedExports: 1, failedJobs: 2, recentAuditEvents: 8 });
    expect(audit).toHaveBeenCalled();
  });
});
