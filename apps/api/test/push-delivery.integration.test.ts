import { describe, expect, it, vi } from 'vitest';
import { PushDeliveryService } from '../src/notifications/push-delivery.service';

describe('push delivery provider contract', () => {
  it('fails closed when no provider is configured', async () => {
    const prisma = {
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      pushToken: { findMany: vi.fn().mockResolvedValue([]) },
    };
    await expect(
      new PushDeliveryService(prisma as never).deliverGeneric('user-1', 'messages'),
    ).rejects.toMatchObject({ response: { code: 'PUSH_PROVIDER_NOT_CONFIGURED' } });
  });
});
