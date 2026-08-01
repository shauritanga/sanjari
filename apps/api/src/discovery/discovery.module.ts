import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { DiscoveryEntitlementService } from './entitlement.service';
import { RankingEvaluationService } from './ranking-evaluation.service';
import { RankingEvaluationWorker } from './ranking-evaluation.worker';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: 'ranking-evaluation' })],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    DiscoveryEntitlementService,
    RankingEvaluationService,
    RankingEvaluationWorker,
  ],
})
export class DiscoveryModule {}
