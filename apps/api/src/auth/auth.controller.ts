import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ data: Awaited<ReturnType<AuthService['register']>> }> {
    return { data: await this.authService.register(dto) };
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ data: Awaited<ReturnType<AuthService['login']>> }> {
    return { data: await this.authService.login(dto) };
  }
}
