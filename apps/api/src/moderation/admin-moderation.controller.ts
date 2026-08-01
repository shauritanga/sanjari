import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminCsrfGuard } from '../admin-auth/admin-csrf.guard';
import { AdminPermissionGuard } from '../admin-auth/admin-permission.guard';
import type { AdminRequest } from '../admin-auth/admin-auth.types';
import { ModerationActionDto, ModerationCaseUpdateDto, ModerationQueueQueryDto } from './dto';
import { ModerationService } from './moderation.service';

@Controller({ path: 'admin/moderation', version: '1' })
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
@SetMetadata('adminPermission', 'reports.resolve')
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('queue')
  async queue(@Req() request: AdminRequest, @Query() query: ModerationQueueQueryDto) {
    return { data: await this.moderation.queue(request.admin!.id, query.status) };
  }

  @Get('appeals')
  async appeals(@Req() request: AdminRequest) {
    return { data: await this.moderation.appealsQueue(request.admin!.id) };
  }

  @Patch('cases/:caseId')
  @UseGuards(AdminCsrfGuard)
  async updateCase(
    @Req() request: AdminRequest,
    @Param('caseId') caseId: string,
    @Body() dto: ModerationCaseUpdateDto,
  ) {
    return { data: await this.moderation.updateCase(request.admin!.id, caseId, dto) };
  }

  @Post('cases/:caseId/actions')
  @UseGuards(AdminCsrfGuard)
  async action(
    @Req() request: AdminRequest,
    @Param('caseId') caseId: string,
    @Body() dto: ModerationActionDto,
  ) {
    return { data: await this.moderation.action(request.admin!.id, caseId, dto) };
  }
}
