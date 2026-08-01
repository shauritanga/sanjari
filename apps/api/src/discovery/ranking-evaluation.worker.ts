import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RankingEvaluationService } from './ranking-evaluation.service';

@Processor('ranking-evaluation')
export class RankingEvaluationWorker extends WorkerHost {
  constructor(private readonly evaluation: RankingEvaluationService) {
    super();
  }

  async process(job: Job<{ rankingVersion: string }>) {
    return this.evaluation.run(job.data.rankingVersion);
  }
}
