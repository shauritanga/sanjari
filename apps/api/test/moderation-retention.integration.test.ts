import { describe, expect, it, vi } from 'vitest';
import { ModerationRetentionService } from '../src/moderation/moderation-retention.service';

describe('moderation evidence retention contract', () => {
  it('purges only expired evidence and records the system audit event', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const audit = vi.fn().mockResolvedValue({});
    const result = await new ModerationRetentionService(
      { reportEvidence: { deleteMany }, auditLog: { create: audit } } as never,
      { get: vi.fn().mockReturnValue(90) } as never,
      undefined,
    ).process();

    expect(result).toEqual({ deletedCount: 3, retentionDays: 90 });
    expect(deleteMany).toHaveBeenCalled();
    expect(audit).toHaveBeenCalled();
  });
});
