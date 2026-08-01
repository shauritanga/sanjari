import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface PushProvider {
  readonly name: string;
  send(token: string, payload: { title: string; body: string }): Promise<void>;
}

@Injectable()
export class PushDeliveryService {
  private provider?: PushProvider;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  register(provider: PushProvider) {
    this.provider = provider;
  }
  async deliverGeneric(userId: string, category: string) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
      select: { push: true },
    });
    if (preference?.push === false) return { delivered: false, reason: 'disabled' };
    if (!this.provider && this.config.get<string>('PUSH_PROVIDER') !== 'local')
      throw new ServiceUnavailableException({
        code: 'PUSH_PROVIDER_NOT_CONFIGURED',
        message: 'Push delivery is not configured.',
      });
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { tokenHash: true },
    });
    if (this.provider)
      await Promise.all(
        tokens.map((token) =>
          this.provider!.send(token.tokenHash, {
            title: 'New Sanjari activity',
            body: 'You have a new notification.',
          }),
        ),
      );
    return { delivered: tokens.length > 0 };
  }
}
