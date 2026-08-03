import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import {
  DiscoveryPauseDto,
  DiscoveryPreferenceDto,
  OnboardingUpdateDto,
  PhotoCompleteDto,
  PhotoPresignDto,
  PhotoReorderDto,
  PromptAnswersDto,
  VerificationPresignDto,
  VerificationSubmitDto,
  VoiceIntroCompleteDto,
  VoiceIntroPresignDto,
} from './dto';
import { ProfilesService } from './profiles.service';
import { VerificationService, VerificationProvider } from './verification.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'onboarding', version: '1' })
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly verification: VerificationService,
  ) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.getOnboarding(request.user!.sub) };
  }

  @Put()
  async update(@Req() request: AuthenticatedRequest, @Body() dto: OnboardingUpdateDto) {
    return { data: await this.profiles.updateOnboarding(request.user!.sub, dto) };
  }

  @Get('preview')
  async preview(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.preview(request.user!.sub) };
  }

  @Post('photos/presign')
  async presignPhoto(@Req() request: AuthenticatedRequest, @Body() dto: PhotoPresignDto) {
    return { data: await this.profiles.presignPhoto(request.user!.sub, dto) };
  }

  @Post('photos/complete')
  async completePhoto(@Req() request: AuthenticatedRequest, @Body() dto: PhotoCompleteDto) {
    return { data: await this.profiles.completePhoto(request.user!.sub, dto.storageKey) };
  }

  @Patch('photos/reorder')
  async reorderPhotos(@Req() request: AuthenticatedRequest, @Body() dto: PhotoReorderDto) {
    return { data: await this.profiles.reorderPhotos(request.user!.sub, dto.photoIds) };
  }

  @Delete('photos/:photoId')
  async deletePhoto(@Req() request: AuthenticatedRequest, @Param('photoId') photoId: string) {
    return { data: await this.profiles.deletePhoto(request.user!.sub, photoId) };
  }

  @Patch('discovery-pause')
  async pauseDiscovery(@Req() request: AuthenticatedRequest, @Body() dto: DiscoveryPauseDto) {
    return { data: await this.profiles.setDiscoveryPaused(request.user!.sub, dto.paused) };
  }

  @Get('verification')
  async verificationStatus(@Req() request: AuthenticatedRequest) {
    return { data: await this.verification.status(request.user!.sub) };
  }

  @Post('verification/:type/presign')
  async presignVerification(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: VerificationProvider,
    @Body() dto: VerificationPresignDto,
  ) {
    return { data: await this.verification.presign(request.user!.sub, type, dto.mimeType) };
  }

  @Post('verification/:type/request')
  async requestVerification(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: VerificationProvider,
    @Body() dto: VerificationSubmitDto,
  ) {
    return { data: await this.verification.request(request.user!.sub, type, dto.storageKey) };
  }

  @Post('publish')
  async publish(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.publish(request.user!.sub) };
  }

  @Get('prompts')
  async prompts(@Query('locale') locale = 'en') {
    return { data: await this.profiles.listPrompts(locale) };
  }

  @Put('prompts')
  async savePrompts(@Req() request: AuthenticatedRequest, @Body() dto: PromptAnswersDto) {
    return { data: await this.profiles.savePromptAnswers(request.user!.sub, dto.answers) };
  }

  @Get('discovery-preferences')
  async discoveryPreference(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.getDiscoveryPreference(request.user!.sub) };
  }

  @Put('discovery-preferences')
  async updateDiscoveryPreference(
    @Req() request: AuthenticatedRequest,
    @Body() dto: DiscoveryPreferenceDto,
  ) {
    return { data: await this.profiles.updateDiscoveryPreference(request.user!.sub, dto) };
  }

  @Post('voice-intro/presign')
  async presignVoiceIntro(@Req() request: AuthenticatedRequest, @Body() dto: VoiceIntroPresignDto) {
    return { data: await this.profiles.presignVoiceIntro(request.user!.sub, dto) };
  }

  @Post('voice-intro/complete')
  async completeVoiceIntro(@Req() request: AuthenticatedRequest, @Body() dto: VoiceIntroCompleteDto) {
    return { data: await this.profiles.completeVoiceIntro(request.user!.sub, dto.storageKey) };
  }

  @Delete('voice-intro')
  async deleteVoiceIntro(@Req() request: AuthenticatedRequest) {
    return { data: await this.profiles.deleteVoiceIntro(request.user!.sub) };
  }
}
