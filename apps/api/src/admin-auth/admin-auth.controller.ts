import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AdminAuthService, ADMIN_SESSION_COOKIE } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminLoginDto } from './dto';
import type { AdminRequest } from './admin-auth.types';

type AdminResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) response: AdminResponse) {
    const result = await this.auth.login(dto);
    response.cookie(ADMIN_SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return {
      data: { admin: result.admin, csrfToken: result.csrfToken, sessionId: result.sessionId },
    };
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  async logout(@Req() request: AdminRequest, @Res({ passthrough: true }) response: AdminResponse) {
    await this.auth.logout(request.sessionId!);
    response.clearCookie(ADMIN_SESSION_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/' });
    return { data: { loggedOut: true } };
  }
}
