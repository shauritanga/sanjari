import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { SocialAuthService } from '../src/auth/social-auth.service';

function authService(prisma: object): AuthService {
  return new AuthService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('authentication integration contracts', () => {
  it('returns only active session metadata and revokes sessions owned by the user', async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      userSession: {
        findMany: vi.fn().mockResolvedValue([{ id: 'session-1', deviceId: 'ios-1' }]),
        updateMany,
      },
      auditLog: { create: auditCreate },
    };
    const service = authService(prisma);

    await expect(service.listSessions('user-1')).resolves.toEqual([
      { id: 'session-1', deviceId: 'ios-1' },
    ]);
    await expect(service.revokeSession('user-1', 'session-1')).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'session-1', userId: 'user-1', revokedAt: null } }),
    );
    expect(auditCreate).toHaveBeenCalled();
  });

  it('does not allow a session revoke to target another user', async () => {
    const prisma = {
      userSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { create: vi.fn() },
    };
    await expect(authService(prisma).revokeSession('user-1', 'session-2')).resolves.toBe(false);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('fails closed when Google or Apple credentials are not configured', async () => {
    await expect(new SocialAuthService().verify('google', 'credential')).rejects.toMatchObject({
      response: { code: 'SOCIAL_PROVIDER_NOT_CONFIGURED' },
    });
  });
});
