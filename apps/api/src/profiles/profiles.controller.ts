import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { OnboardingUpdateDto } from './dto';
import { ProfilesService } from './profiles.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'onboarding', version: '1' })
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.getOnboarding(request.user!.sub) };
  }

  @Put()
  async update(@Req() request: AuthenticatedRequest, @Body() dto: OnboardingUpdateDto) {
    return { data: await this.profiles.updateOnboarding(request.user!.sub, dto) };
  }

  @Post('publish')
  async publish(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.publish(request.user!.sub) };
  }
}
