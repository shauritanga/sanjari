import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/access-token.guard';
import { MatchesService } from './matches.service';

@UseGuards(AccessTokenGuard)
@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await this.matches.list(request.user!.sub) };
  }
}
