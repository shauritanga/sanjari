import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { AppealDto, BlockDto, ReportDto } from './dto';
import { ModerationService } from './moderation.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: '', version: '1' })
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('safety/guidance')
  guidance() {
    return { data: this.moderation.guidance() };
  }

  @Get('blocks')
  async blocks(@Req() request: AuthenticatedRequest) {
    return { data: await this.moderation.listBlocks(request.user!.sub) };
  }

  @Post('blocks/:userId')
  async block(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: BlockDto,
  ) {
    return { data: await this.moderation.block(request.user!.sub, userId, dto) };
  }

  @Delete('blocks/:userId')
  async unblock(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return { data: await this.moderation.unblock(request.user!.sub, userId) };
  }

  @Post('reports')
  async report(@Req() request: AuthenticatedRequest, @Body() dto: ReportDto) {
    return { data: await this.moderation.report(request.user!.sub, dto) };
  }

  @Post('moderation/cases/:caseId/appeals')
  async appeal(
    @Req() request: AuthenticatedRequest,
    @Param('caseId') caseId: string,
    @Body() dto: AppealDto,
  ) {
    return { data: await this.moderation.appeal(request.user!.sub, caseId, dto) };
  }
}
