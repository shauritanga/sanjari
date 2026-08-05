import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { AppealDto, BlockDto, ContactsBlockDto, DataDeletionDto, ReportDto } from './dto';
import { DataExportService } from './data-export.service';
import { ModerationService } from './moderation.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: '', version: '1' })
export class ModerationController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly exportStorage: DataExportService,
  ) {}

  @Get('safety/guidance')
  guidance(@Query('locale') locale?: string) {
    return { data: this.moderation.guidance(locale) };
  }

  @Get('safety/data-controls')
  async dataControls(@Req() request: AuthenticatedRequest) {
    return { data: await this.moderation.dataControls(request.user!.sub) };
  }

  @Post('safety/data-export')
  async dataExport(@Req() request: AuthenticatedRequest) {
    return { data: await this.moderation.requestDataExport(request.user!.sub) };
  }

  @Get('safety/data-export/:requestId')
  async dataExportDownload(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return { data: await this.exportStorage.downloadInfo(request.user!.sub, requestId) };
  }

  @Post('safety/account-deletion')
  async accountDeletion(@Req() request: AuthenticatedRequest, @Body() dto: DataDeletionDto) {
    return { data: await this.moderation.requestAccountDeletion(request.user!.sub, dto) };
  }

  @Post('safety/account-deactivation')
  async accountDeactivation(@Req() request: AuthenticatedRequest) {
    return { data: await this.moderation.deactivateAccount(request.user!.sub) };
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

  @Post('contacts/block')
  async blockByContacts(@Req() request: AuthenticatedRequest, @Body() dto: ContactsBlockDto) {
    return { data: await this.moderation.blockByContacts(request.user!.sub, dto.hashes) };
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

  @Get('safety/appeals')
  async appealableCases(@Req() request: AuthenticatedRequest) {
    return { data: await this.moderation.appealableCases(request.user!.sub) };
  }
}
