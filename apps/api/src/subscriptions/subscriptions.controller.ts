import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { PurchaseWebhookDto } from './dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('plans')
  async plans() {
    return { data: await this.subscriptions.plans() };
  }

  @Get('webhooks')
  webhookContract() {
    return { data: { providers: ['apple', 'google'], idempotency: 'provider_and_externalEventId', signatureRequired: true } };
  }

  @Post('webhooks')
  async webhook(@Body() dto: PurchaseWebhookDto) {
    return { data: await this.subscriptions.processWebhook(dto) };
  }

  @UseGuards(AccessTokenGuard)
  @Get('status')
  async status(@Req() request: AuthenticatedRequest) {
    return { data: await this.subscriptions.status(request.user!.sub) };
  }
}
