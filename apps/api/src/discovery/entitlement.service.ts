import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class DiscoveryEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async canUndo(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      include: { plan: { select: { metadata: true } } },
      orderBy: { endsAt: 'desc' },
    });
    const metadata = subscription?.plan.metadata;
    return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) && (metadata as { undo?: boolean }).undo === true;
  }
}
