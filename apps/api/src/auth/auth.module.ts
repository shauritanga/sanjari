import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { PhoneVerificationService } from './phone-verification.service';
import { SmsService } from './sms.service';
import { SocialAuthService } from './social-auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenGuard,
    EmailService,
    EmailVerificationService,
    PasswordResetService,
    PhoneVerificationService,
    SmsService,
    SocialAuthService,
  ],
  exports: [AccessTokenGuard, JwtModule],
})
export class AuthModule {}
