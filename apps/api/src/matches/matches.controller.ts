import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { UnmatchDto } from './dto';
import { MatchesService } from './matches.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await this.matches.list(request.user!.sub) };
  }

  @Post(':matchId/unmatch')
  async unmatch(
    @Req() request: AuthenticatedRequest,
    @Param('matchId') matchId: string,
    @Body() dto: UnmatchDto,
  ) {
    return { data: await this.matches.unmatch(request.user!.sub, matchId, dto.reason) };
  }
}
