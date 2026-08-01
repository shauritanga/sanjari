import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { DiscoveryEntitlementService } from './entitlement.service';
import { RankingEvaluationService } from './ranking-evaluation.service';

@Module({
  imports: [AuthModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, DiscoveryEntitlementService, RankingEvaluationService],
})
export class DiscoveryModule {}
