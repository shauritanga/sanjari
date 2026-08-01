import { Body, Controller, Param, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { DiscoveryQueryDto, LikeDto, PassDto, UndoDto } from './dto';
import { DiscoveryService } from './discovery.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'discovery', version: '1' })
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async discover(@Req() request: AuthenticatedRequest, @Query() query: DiscoveryQueryDto) {
    return this.discovery.discover(request.user!.sub, query.cursor);
  }

  @Post(':userId/like')
  async like(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: LikeDto,
  ) {
    return { data: await this.discovery.like(request.user!.sub, userId, dto) };
  }

  @Post(':userId/pass')
  async pass(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: PassDto,
  ) {
    return { data: await this.discovery.pass(request.user!.sub, userId, dto.idempotencyKey) };
  }

  @Post('undo')
  async undo(@Req() request: AuthenticatedRequest, @Body() dto: UndoDto) {
    return { data: await this.discovery.undo(request.user!.sub, dto.targetUserId) };
  }
}
