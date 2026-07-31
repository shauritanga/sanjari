import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from './access-token.guard';
import { AuthService } from './auth.service';
import {
  EmailAddressDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';

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

  @Post('email/verify')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ data: { userId: string; verified: true } }> {
    const result = await this.authService.verifyEmail(dto.email, dto.code);
    return { data: { ...result, verified: true } };
  }

  @Post('email/resend')
  async resendEmail(@Body() dto: EmailAddressDto): Promise<{ data: { accepted: true } }> {
    await this.authService.resendEmailVerification(dto.email);
    return { data: { accepted: true } };
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: EmailAddressDto): Promise<{ data: { accepted: true } }> {
    await this.authService.requestPasswordReset(dto.email);
    return { data: { accepted: true } };
  }

  @Post('password-reset/complete')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ data: { userId: string; reset: true } }> {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    return { data: { ...result, reset: true } };
  }
}
