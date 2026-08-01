import { describe, expect, it, vi } from 'vitest';
import { MatchesService } from '../src/matches/matches.service';

describe('matches safety context contract', () => {
  it('returns matched user context while filtering blocked users', async () => {
    const prisma = {
      match: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'match-1',
            userAId: 'user-1',
            userBId: 'user-2',
            createdAt: new Date(),
            userA: { id: 'user-1', profile: { displayName: 'A', city: 'Dar' } },
            userB: { id: 'user-2', profile: { displayName: 'B', city: 'Arusha' } },
            conversation: { id: 'conversation-1' },
          },
        ]),
      },
      block: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const result = await new MatchesService(prisma as never).list('user-1');
    expect(result).toEqual([
      expect.objectContaining({
        user: { id: 'user-2', profile: { displayName: 'B', city: 'Arusha' } },
      }),
    ]);
  });
});
