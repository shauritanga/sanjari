import { describe, expect, it, vi } from 'vitest';
import { hash } from 'argon2';
import { AdminAuthService } from '../src/admin-auth/admin-auth.service';

describe('admin authentication integration contracts', () => {
  it('creates a database-backed session and returns a CSRF token', async () => {
    const passwordHash = await hash('correct-admin-password');
    const create = vi.fn().mockResolvedValue({ id: 'session-1' });
    const prisma = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admin-1',
          email: 'admin@example.test',
          displayName: 'Admin',
          passwordHash,
          status: 'active',
          mfaEnabled: false,
          roles: [{ role: { permissions: [{ permission: { key: 'reports.resolve' } }] } }],
        }),
      },
      adminSession: { create },
    };
    const result = await new AdminAuthService(
      prisma as never,
      { get: vi.fn().mockReturnValue('disabled') } as never,
    ).login({
      email: 'admin@example.test',
      password: 'correct-admin-password',
    });
    expect(result.admin).toMatchObject({ id: 'admin-1', permissions: ['reports.resolve'] });
    expect(result.sessionToken).toBeTruthy();
    expect(result.csrfToken).toBeTruthy();
    expect(create).toHaveBeenCalled();
  });

  it('fails closed when an admin account requires MFA without a configured verifier', async () => {
    const passwordHash = await hash('correct-admin-password');
    const prisma = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admin-1',
          email: 'admin@example.test',
          displayName: 'Admin',
          passwordHash,
          status: 'active',
          mfaEnabled: true,
          roles: [],
        }),
      },
    };
    await expect(
      new AdminAuthService(
        prisma as never,
        { get: vi.fn().mockReturnValue('disabled') } as never,
      ).login({
        email: 'admin@example.test',
        password: 'correct-admin-password',
      }),
    ).rejects.toMatchObject({ response: { code: 'ADMIN_MFA_REQUIRED' } });
  });
});
