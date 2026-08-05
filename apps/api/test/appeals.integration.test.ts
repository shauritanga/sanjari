import { describe, expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/moderation.service';

describe('appeals client contract', () => {
  it('lists only cases belonging to the reported user', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        {
          id: 'case-1',
          status: 'actioned',
          report: { category: 'scam', appealStatus: null },
          appeals: [],
        },
      ]);
    const result = await new ModerationService(
      {
        moderationCase: { findMany },
      } as never,
      {} as never,
    ).appealableCases('user-2');
    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          report: { reportedUserId: 'user-2' },
          status: { in: ['actioned', 'suspended', 'banned', 'appealed'] },
        },
      }),
    );
  });
});
