import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';

const dto = {
  provider: 'local',
  externalEventId: 'event-1',
  signature: '',
  productCode: 'premium-monthly',
  transactionId: 'transaction-1',
  userId: 'user-1',
  status: 'active',
  startsAt: '2026-08-01T00:00:00.000Z',
};

function signedDto() {
  const signature = createHmac('sha256', 'test-secret')
    .update('local:event-1:transaction-1:premium-monthly:active')
    .digest('hex');
  return { ...dto, signature };
}

describe('subscription entitlement contracts', () => {
  it('derives entitlement status from the server subscription record', async () => {
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({
          status: 'active',
          provider: 'local',
          endsAt: null,
          plan: { code: 'premium-monthly', title: 'Premium', metadata: { undo: true, travel: false } },
          purchases: [{ provider: 'local', transactionId: 'transaction-1', status: 'active', createdAt: new Date() }],
        }),
      },
    };
    const result = await new SubscriptionsService(prisma as never, { get: vi.fn() } as never).status('user-1');
    expect(result.status).toBe('active');
    expect(result.entitlements).toEqual({ undo: true, travel: false });
  });

  it('rejects invalid webhook signatures and records the invalid event', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const prisma = { paymentEvent: { findUnique: vi.fn().mockResolvedValue(null), create } };
    const config = { get: vi.fn((key: string) => key === 'PURCHASE_VERIFICATION_PROVIDER' ? 'local' : 'test-secret') };
    await expect(new SubscriptionsService(prisma as never, config as never).processWebhook(dto)).rejects.toMatchObject({ response: { code: 'PURCHASE_SIGNATURE_INVALID' } });
    expect(create).toHaveBeenCalled();
  });

  it('processes a verified webhook once and returns duplicate for redelivery', async () => {
    const event = { id: 'event-1' };
    const tx = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      subscription: {
        create: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
      },
      paymentEvent: { update: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      paymentEvent: { findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ ...event, signatureValid: true }), create: vi.fn().mockResolvedValue(event) },
      subscriptionPlan: { findUnique: vi.fn().mockResolvedValue({ id: 'plan-1' }) },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => Promise.resolve(callback(tx))),
    };
    const config = { get: vi.fn((key: string) => key === 'PURCHASE_VERIFICATION_PROVIDER' ? 'local' : 'test-secret') };
    const service = new SubscriptionsService(prisma as never, config as never);
    await expect(service.processWebhook(signedDto())).resolves.toMatchObject({ accepted: true, duplicate: false });
    await expect(service.processWebhook(signedDto())).resolves.toEqual({ duplicate: true, accepted: true, eventId: 'event-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
