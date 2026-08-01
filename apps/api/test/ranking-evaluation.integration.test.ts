import { describe, expect, it, vi } from 'vitest';
import { RankingEvaluationService } from '../src/discovery/ranking-evaluation.service';

describe('ranking evaluation worker contract', () => {
  it('records queued work and returns action and match rates', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      backgroundJobRecord: { upsert, update },
      recommendation: {
        count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(4).mockResolvedValueOnce(2),
      },
    };
    const worker = new RankingEvaluationService(prisma as never);
    await expect(worker.enqueue('w04-rules-v1')).resolves.toEqual({
      jobKey: 'ranking-evaluation:w04-rules-v1',
      status: 'queued',
    });
    await expect(worker.run('w04-rules-v1')).resolves.toMatchObject({
      shown: 10,
      acted: 4,
      matched: 2,
      actionRate: 0.4,
      matchRate: 0.2,
    });
    expect(update).toHaveBeenCalled();
  });
});
