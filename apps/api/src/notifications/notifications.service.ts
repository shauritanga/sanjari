import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';

export const NOTIFICATION_CATEGORIES = ['matches', 'messages', 'likes', 'promotions'] as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const saved = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const byCategory = new Map(saved.map((item) => [item.category, item]));
    return NOTIFICATION_CATEGORIES.map((category) => {
      const existing = byCategory.get(category);
      return {
        category,
        push: existing?.push ?? true,
        email: existing?.email ?? false,
        sms: existing?.sms ?? false,
      };
    });
  }

  async registerPushToken(userId: string, token: string, provider: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return this.prisma.pushToken.upsert({
      where: { tokenHash },
      create: { userId, tokenHash, provider },
      update: { userId, provider },
    });
  }

  async setPreference(
    userId: string,
    input: { category: string; push?: boolean; email?: boolean; sms?: boolean },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category: input.category } },
      create: {
        userId,
        category: input.category,
        push: input.push ?? true,
        email: input.email ?? false,
        sms: input.sms ?? false,
      },
      update: {
        ...(input.push !== undefined ? { push: input.push } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.sms !== undefined ? { sms: input.sms } : {}),
      },
    });
  }
}
