import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { NotificationPreferenceDto, PushTokenDto } from './dto';
import { NotificationsService } from './notifications.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  async pushToken(@Req() request: AuthenticatedRequest, @Body() dto: PushTokenDto) {
    return {
      data: await this.notifications.registerPushToken(request.user!.sub, dto.token, dto.provider),
    };
  }

  @Post('preferences')
  async preference(@Req() request: AuthenticatedRequest, @Body() dto: NotificationPreferenceDto) {
    return { data: await this.notifications.setPreference(request.user!.sub, dto) };
  }
}
