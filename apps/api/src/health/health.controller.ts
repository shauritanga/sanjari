import {
  Controller,
  Get,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../common/database/prisma.service';

@Controller({ path: 'health', version: '1' })
export class HealthController implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'wait') await this.redis.quit();
  }

  @Get()
  health(): { data: { status: 'ok'; service: 'api' } } {
    return { data: { status: 'ok', service: 'api' } };
  }

  @Get('readiness')
  async readiness() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };
    if (!checks.database || !checks.redis) {
      throw new ServiceUnavailableException({
        data: { status: 'not_ready', service: 'api', checks },
      });
    }
    return { data: { status: 'ready', service: 'api', checks } };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
