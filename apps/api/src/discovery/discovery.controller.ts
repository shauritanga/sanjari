import { Body, Controller, Param, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { DiscoveryQueryDto, LikeDto, PassDto, ProtectedLocationDto, UndoDto } from './dto';
import { DiscoveryService } from './discovery.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'discovery', version: '1' })
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async discover(@Req() request: AuthenticatedRequest, @Query() query: DiscoveryQueryDto) {
    return this.discovery.discover(request.user!.sub, query.cursor, {
      ...(query.recentlyActive !== undefined && { recentlyActive: query.recentlyActive }),
      ...(query.newMembers !== undefined && { newMembers: query.newMembers }),
    });
  }

  @Get('likes-received')
  async likesReceived(@Req() request: AuthenticatedRequest) {
    return { data: await this.discovery.likesReceived(request.user!.sub) };
  }

  @Get('profile/:userId')
  async profileDetail(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return { data: await this.discovery.profileDetail(request.user!.sub, userId) };
  }

  @Get('share/:token')
  async sharedProfile(@Param('token') token: string) {
    return { data: await this.discovery.getSharedProfile(token) };
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

  @Post('location')
  async location(@Req() request: AuthenticatedRequest, @Body() dto: ProtectedLocationDto) {
    return { data: await this.discovery.updateLocation(request.user!.sub, dto) };
  }
}
