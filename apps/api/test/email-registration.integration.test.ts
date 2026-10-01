import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

const validInput = {
  email: 'new.member@example.com',
  dateOfBirth: new Date('2000-01-01'),
  acceptedTermsVersion: '2026-01',
  acceptedPrivacyVersion: '2026-01',
  confirmedAdult: true as const,
  locale: 'en' as const,
};

function service(overrides: {
  prisma?: object;
  jwt?: object;
  config?: object;
  emailVerification?: object;
}) {
  const config = overrides.config ?? {
    getOrThrow: vi.fn((key: string) =>
      key.includes('SECRET') ? 'a-very-long-test-secret' : 'value',
    ),
  };
  const jwt = overrides.jwt ?? {
    signAsync: vi.fn().mockResolvedValue('signed-token'),
  };
  return new AuthService(
    (overrides.prisma ?? {}) as never,
    jwt as never,
    config as never,
    (overrides.emailVerification ?? {}) as never,
    {} as never,
    {} as never,
  );
}

describe('email registration (mirrors phone registration)', () => {
  it('rejects an under-18 date of birth before touching the database', async () => {
    const userCreate = vi.fn();
    const prisma = { $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ user: { create: userCreate } })) };
    const emailVerification = { issue: vi.fn() };

    await expect(
      service({ prisma, emailVerification }).registerEmail({
        ...validInput,
        dateOfBirth: new Date(),
      }),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_FAILED' } });

    expect(userCreate).not.toHaveBeenCalled();
    expect(emailVerification.issue).not.toHaveBeenCalled();
  });

  it('creates a pending passwordless account and issues an OTP', async () => {
    const userCreate = vi.fn().mockResolvedValue({
      id: 'user-1',
      profile: { onboardingStatus: 'registration_started' },
    });
    const prisma = {
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ user: { create: userCreate } })),
    };
    const emailVerification = { issue: vi.fn().mockResolvedValue(undefined) };

    const result = await service({ prisma, emailVerification }).registerEmail(validInput);

    expect(result).toEqual({
      userId: 'user-1',
      onboardingStatus: 'registration_started',
      emailVerificationRequired: true,
    });
    expect(userCreate).toHaveBeenCalledTimes(1);
    const createArgs = userCreate.mock.calls[0]?.[0] as {
      data: { email: string; status: string; credentials?: unknown };
    };
    expect(createArgs.data.email).toBe(validInput.email);
    expect(createArgs.data.status).toBe('pending_verification');
    expect(createArgs.data.credentials).toBeUndefined();
    expect(emailVerification.issue).toHaveBeenCalledWith('user-1', validInput.email);
  });

  it('reports a clear conflict when the email is already registered', async () => {
    const conflict = Object.assign(new Error('duplicate'), { code: 'P2002' });
    const prisma = {
      $transaction: vi.fn().mockRejectedValue(conflict),
    };
    const emailVerification = { issue: vi.fn() };

    await expect(service({ prisma, emailVerification }).registerEmail(validInput)).rejects.toMatchObject({
      response: { code: 'ACCOUNT_EXISTS' },
    });
    expect(emailVerification.issue).not.toHaveBeenCalled();
  });

  it('verifies the registration OTP and issues the first session', async () => {
    const emailVerification = {
      verify: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const prisma = {
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1', email: validInput.email }),
      },
      userSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    const result = await service({ prisma, emailVerification }).verifyEmail(
      validInput.email,
      '123456',
      'device-1',
    );

    expect(emailVerification.verify).toHaveBeenCalledWith(validInput.email, '123456');
    expect(result).toMatchObject({ userId: 'user-1', accessToken: 'signed-token' });
  });
});
