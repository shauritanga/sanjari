import { describe, expect, it, vi } from 'vitest';
import { DataExportService } from '../src/moderation/data-export.service';

describe('data export delivery contract', () => {
  it('generates an expiring local artifact and completes the request', async () => {
    const requestUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      dataExportRequest: { update: requestUpdate },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      dataExportRequest: {
        findMany: vi.fn().mockResolvedValue([{ id: 'request-1', userId: 'user-1' }]),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.test',
          phoneNumber: null,
          locale: 'en',
          dateOfBirth: new Date('1990-01-01'),
          createdAt: new Date(),
          profile: null,
          reportsSubmitted: [],
          blocksSent: [],
        }),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const result = await new DataExportService(
      prisma as never,
      { get: vi.fn().mockReturnValue('local') } as never,
      undefined,
    ).process();

    expect(result).toEqual({ status: 'completed', completed: 1 });
    expect(requestUpdate).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('does not process exports when no provider is configured', async () => {
    const findMany = vi.fn();
    const result = await new DataExportService(
      { dataExportRequest: { findMany } } as never,
      { get: vi.fn().mockReturnValue('disabled') } as never,
      undefined,
    ).process();
    expect(result).toEqual({ status: 'pending_provider' });
    expect(findMany).not.toHaveBeenCalled();
  });
});
