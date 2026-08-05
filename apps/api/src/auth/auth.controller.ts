import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, AuthenticatedRequest } from './access-token.guard';
import { AuthService } from './auth.service';
import {
  EmailAddressDto,
  EmailChangeConfirmDto,
  EmailChangeRequestDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
  PhoneLoginDto,
  PhoneNumberDto,
  PhoneVerificationDto,
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

  @UseGuards(AccessTokenGuard)
  @Get('sessions')
  async sessions(@Req() request: AuthenticatedRequest) {
    return { data: await this.authService.listSessions(request.user!.sub) };
  }

  @UseGuards(AccessTokenGuard)
  @Delete('sessions/:sessionId')
  async revokeSession(@Req() request: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return {
      data: { revoked: await this.authService.revokeSession(request.user!.sub, sessionId) },
    };
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

  @UseGuards(AccessTokenGuard)
  @Post('phone/request')
  async requestPhone(
    @Req() request: AuthenticatedRequest,
    @Body() dto: PhoneNumberDto,
  ): Promise<{ data: { accepted: true } }> {
    await this.authService.requestPhoneVerification(request.user!.sub, dto.phoneNumber);
    return { data: { accepted: true } };
  }

  @UseGuards(AccessTokenGuard)
  @Post('phone/verify')
  async verifyPhone(
    @Req() request: AuthenticatedRequest,
    @Body() dto: PhoneVerificationDto,
  ): Promise<{ data: { userId: string; verified: true } }> {
    const result = await this.authService.verifyPhone(request.user!.sub, dto.phoneNumber, dto.code);
    return { data: { ...result, verified: true } };
  }

  @Post('phone/login/request')
  async requestPhoneLogin(@Body() dto: PhoneNumberDto): Promise<{ data: { accepted: true } }> {
    await this.authService.requestPhoneLogin(dto.phoneNumber);
    return { data: { accepted: true } };
  }

  @Post('phone/login/verify')
  async verifyPhoneLogin(
    @Body() dto: PhoneLoginDto,
  ): Promise<{ data: Awaited<ReturnType<AuthService['verifyPhoneLogin']>> }> {
    return {
      data: await this.authService.verifyPhoneLogin(dto.phoneNumber, dto.code, dto.deviceId),
    };
  }

  @UseGuards(AccessTokenGuard)
  @Post('email/change/request')
  async requestEmailChange(
    @Req() request: AuthenticatedRequest,
    @Body() dto: EmailChangeRequestDto,
  ): Promise<{ data: { accepted: true } }> {
    await this.authService.requestEmailChange(request.user!.sub, dto.newEmail);
    return { data: { accepted: true } };
  }

  @UseGuards(AccessTokenGuard)
  @Post('email/change/confirm')
  async confirmEmailChange(
    @Req() request: AuthenticatedRequest,
    @Body() dto: EmailChangeConfirmDto,
  ): Promise<{ data: { email: string; changed: true } }> {
    const result = await this.authService.confirmEmailChange(
      request.user!.sub,
      dto.newEmail,
      dto.code,
    );
    return { data: { ...result, changed: true } };
  }
}
