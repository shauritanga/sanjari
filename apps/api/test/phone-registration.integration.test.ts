import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

const validInput = {
  phoneNumber: '+255700000001',
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
  phoneVerification?: object;
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
    {} as never,
    {} as never,
    (overrides.phoneVerification ?? {}) as never,
  );
}

describe('phone registration', () => {
  it('rejects an under-18 date of birth before touching the database', async () => {
    const userCreate = vi.fn();
    const prisma = { $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ user: { create: userCreate } })) };
    const phoneVerification = { issue: vi.fn() };

    await expect(
      service({ prisma, phoneVerification }).registerPhone({
        ...validInput,
        dateOfBirth: new Date(),
      }),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_FAILED' } });

    expect(userCreate).not.toHaveBeenCalled();
    expect(phoneVerification.issue).not.toHaveBeenCalled();
  });

  it('creates a pending phone-only account and issues an OTP', async () => {
    const userCreate = vi.fn().mockResolvedValue({
      id: 'user-1',
      profile: { onboardingStatus: 'registration_started' },
    });
    const prisma = {
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ user: { create: userCreate } })),
    };
    const phoneVerification = { issue: vi.fn().mockResolvedValue(undefined) };

    const result = await service({ prisma, phoneVerification }).registerPhone(validInput);

    expect(result).toEqual({
      userId: 'user-1',
      onboardingStatus: 'registration_started',
      phoneVerificationRequired: true,
    });
    expect(userCreate).toHaveBeenCalledTimes(1);
    const createArgs = userCreate.mock.calls[0]?.[0] as {
      data: { phoneNumber: string; status: string };
    };
    expect(createArgs.data.phoneNumber).toBe(validInput.phoneNumber);
    expect(createArgs.data.status).toBe('pending_verification');
    expect(phoneVerification.issue).toHaveBeenCalledWith('user-1', validInput.phoneNumber);
  });

  it('reports a clear conflict when the phone number is already registered', async () => {
    const conflict = Object.assign(new Error('duplicate'), { code: 'P2002' });
    const prisma = {
      $transaction: vi.fn().mockRejectedValue(conflict),
    };
    const phoneVerification = { issue: vi.fn() };

    await expect(service({ prisma, phoneVerification }).registerPhone(validInput)).rejects.toMatchObject({
      response: { code: 'ACCOUNT_EXISTS' },
    });
    expect(phoneVerification.issue).not.toHaveBeenCalled();
  });

  it('activates a pending account on verify and issues a session', async () => {
    const phoneVerification = {
      verifyForLogin: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const userUpdate = vi.fn().mockResolvedValue({ id: 'user-1', email: null });
    const prisma = {
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1', status: 'pending_verification', email: null }),
        update: userUpdate,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      userSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const result = await service({ prisma, phoneVerification }).verifyPhoneRegistration(
      validInput.phoneNumber,
      '123456',
      'device-1',
    );

    expect(result.userId).toBe('user-1');
    expect(result.accessToken).toBe('signed-token');
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'active' },
    });
  });

  it('does not reactivate an account that is not pending verification', async () => {
    const phoneVerification = {
      verifyForLogin: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const userUpdate = vi.fn();
    const prisma = {
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1', status: 'deactivated', email: null }),
        update: userUpdate,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      userSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    await service({ prisma, phoneVerification }).verifyPhoneRegistration(
      validInput.phoneNumber,
      '123456',
      'device-1',
    );

    expect(userUpdate).not.toHaveBeenCalled();
  });
});
