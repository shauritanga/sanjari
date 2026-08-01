import { describe, expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/moderation.service';

function prismaForModeration() {
  const tx = {
    block: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    report: {
      create: vi.fn().mockResolvedValue({ id: 'report-1', status: 'submitted', priority: 'high' }),
      update: vi.fn().mockResolvedValue({}),
    },
    reportEvidence: { createMany: vi.fn().mockResolvedValue({}) },
    moderationCase: { create: vi.fn().mockResolvedValue({ id: 'case-1' }) },
    riskSignal: { create: vi.fn().mockResolvedValue({}) },
    appeal: {
      create: vi.fn().mockResolvedValue({ id: 'appeal-1', caseId: 'case-1', status: 'submitted' }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-2' }) },
    block: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    moderationCase: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'case-1',
        reportId: 'report-1',
        report: { reportedUserId: 'user-2' },
      }),
    },
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
    tx,
  };
}

describe('safety and moderation integration contracts', () => {
  it('creates an auditable block that immediately applies to conversation authorization', async () => {
    const prisma = prismaForModeration();
    const result = await new ModerationService(prisma as never).block('user-1', 'user-2', {});
    expect(result).toEqual({ blockedUserId: 'user-2', blocked: true });
    expect(prisma.tx.block.upsert).toHaveBeenCalled();
    expect(prisma.tx.auditLog.create).toHaveBeenCalled();
  });

  it('creates a moderation case, evidence references, and a high-risk signal for scam reports', async () => {
    const prisma = prismaForModeration();
    const result = await new ModerationService(prisma as never).report('user-1', {
      reportedUserId: 'user-2',
      category: 'scam',
      description: 'They requested payment off-platform.',
      evidence: [{ type: 'message', referenceId: 'message-1' }],
    });
    expect(result).toMatchObject({ id: 'report-1', caseId: 'case-1', priority: 'high' });
    expect(prisma.tx.reportEvidence.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ reportId: 'report-1', type: 'message', snapshot: { referenceId: 'message-1' } }],
      }),
    );
    expect(prisma.tx.riskSignal.create).toHaveBeenCalled();
    expect(prisma.tx.auditLog.create).toHaveBeenCalled();
  });

  it('allows only the reported user to submit an appeal', async () => {
    const prisma = prismaForModeration();
    const result = await new ModerationService(prisma as never).appeal('user-2', 'case-1', {
      statement: 'I would like a human review of this moderation case.',
    });
    expect(result).toEqual({ id: 'appeal-1', caseId: 'case-1', status: 'submitted' });
    await expect(
      new ModerationService(prisma as never).appeal('user-3', 'case-1', {
        statement: 'I would like a human review of this moderation case.',
      }),
    ).rejects.toMatchObject({ response: { code: 'APPEAL_NOT_ALLOWED' } });
  });
});
