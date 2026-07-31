import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from './access-token.guard';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from './dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ data: Awaited<ReturnType<AuthService['register']>> }> {
    return { data: await this.authService.register(dto) };
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ data: Awaited<ReturnType<AuthService['login']>> }> {
    return { data: await this.authService.login(dto) };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ data: Awaited<ReturnType<AuthService['refresh']>> }> {
    return { data: await this.authService.refresh(dto.refreshToken) };
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto): Promise<{ data: { revoked: boolean } }> {
    return { data: { revoked: await this.authService.logout(dto.refreshToken) } };
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout-all')
  async logoutAll(@Req() request: AuthenticatedRequest): Promise<{ data: { revoked: number } }> {
    return { data: { revoked: await this.authService.logoutAll(request.user!.sub) } };
  }
}
