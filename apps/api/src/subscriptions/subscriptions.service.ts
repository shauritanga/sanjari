import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../common/database/prisma.service';
import { PurchaseWebhookDto } from './dto';

function entitlementMap(metadata: unknown): Record<string, boolean> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value === 'boolean')) as Record<string, boolean>;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async plans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      select: { id: true, code: true, title: true, description: true, priceCents: true, currency: true, metadata: true },
      orderBy: { priceCents: 'asc' },
    });
  }

  async status(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true, purchases: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { updatedAt: 'desc' },
    });
    const current = subscription && ['active', 'trialing', 'grace_period'].includes(subscription.status) && (!subscription.endsAt || subscription.endsAt > new Date()) ? subscription : null;
    return {
      status: current?.status ?? 'free',
      provider: current?.provider ?? null,
      endsAt: current?.endsAt ?? null,
      plan: current?.plan ? { code: current.plan.code, title: current.plan.title } : null,
      entitlements: entitlementMap(current?.plan.metadata),
      purchases: current?.purchases.map((purchase) => ({ provider: purchase.provider, transactionId: purchase.transactionId, status: purchase.status, createdAt: purchase.createdAt })) ?? [],
    };
  }

  async processWebhook(dto: PurchaseWebhookDto) {
    const existing = await this.prisma.paymentEvent.findUnique({ where: { provider_externalEventId: { provider: dto.provider, externalEventId: dto.externalEventId } } });
    if (existing) return { duplicate: true, accepted: existing.signatureValid, eventId: existing.id };
    const signatureValid = this.verifySignature(dto);
    const event = await this.prisma.paymentEvent.create({
      data: {
        provider: dto.provider,
        externalEventId: dto.externalEventId,
        eventType: dto.status,
        signatureValid,
        payload: { productCode: dto.productCode, transactionId: dto.transactionId, userId: dto.userId, status: dto.status, startsAt: dto.startsAt, endsAt: dto.endsAt ?? null },
      },
    });
    if (!signatureValid) throw new ForbiddenException({ code: 'PURCHASE_SIGNATURE_INVALID', message: 'Purchase signature is invalid.' });
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code: dto.productCode }, select: { id: true } });
    if (!plan) throw new NotFoundException({ code: 'PURCHASE_PRODUCT_UNKNOWN', message: 'Purchase product is not configured.' });
    const result = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { provider_transactionId: { provider: dto.provider, transactionId: dto.transactionId } } });
      const subscription = purchase
        ? await tx.subscription.update({ where: { id: purchase.subscriptionId }, data: { planId: plan.id, status: dto.status, provider: dto.provider, startsAt: new Date(dto.startsAt), endsAt: dto.endsAt ? new Date(dto.endsAt) : null } })
        : await tx.subscription.create({ data: { userId: dto.userId, planId: plan.id, status: dto.status, provider: dto.provider, startsAt: new Date(dto.startsAt), endsAt: dto.endsAt ? new Date(dto.endsAt) : null } });
      if (purchase) {
        await tx.purchase.update({ where: { id: purchase.id }, data: { status: dto.status, rawEventId: event.id } });
      } else {
        await tx.purchase.create({ data: { subscriptionId: subscription.id, provider: dto.provider, transactionId: dto.transactionId, status: dto.status, rawEventId: event.id } });
      }
      await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      return subscription;
    });
    return { duplicate: false, accepted: true, eventId: event.id, subscriptionId: result.id };
  }

  private verifySignature(dto: PurchaseWebhookDto) {
    const providerMode = this.config.get<string>('PURCHASE_VERIFICATION_PROVIDER', 'disabled');
    if (providerMode === 'owner' || (dto.provider !== 'local' && providerMode !== 'local')) return false;
    const secret = this.config.get<string>('PURCHASE_WEBHOOK_SECRET', '');
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update(`${dto.provider}:${dto.externalEventId}:${dto.transactionId}:${dto.productCode}:${dto.status}`).digest('hex');
    const actual = Buffer.from(dto.signature);
    const expectedBuffer = Buffer.from(expected);
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  }
}
