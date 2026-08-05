import { describe, expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/moderation.service';

describe('safety data controls contract', () => {
  it('returns localized guidance and schedules deletion with a cooling-off period', async () => {
    const created = {
      id: 'deletion-1',
      status: 'scheduled',
      executeAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const tx = {
      accountDeletionRequest: { create: vi.fn().mockResolvedValue(created) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      accountDeletionRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      dataExportRequest: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const service = new ModerationService(prisma as never, {} as never);
    expect(service.guidance('sw').sections.map((section) => section.key)).toContain('guidelines');
    const result = await service.requestAccountDeletion('user-1', { reason: 'I am leaving.' });
    expect(result).toMatchObject({ id: 'deletion-1', status: 'scheduled' });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
