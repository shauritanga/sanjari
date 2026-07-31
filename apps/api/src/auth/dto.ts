import { IsBoolean, IsDateString, IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsDateString()
  dateOfBirth!: Date;

  @IsString()
  @MinLength(1)
  acceptedTermsVersion!: string;

  @IsString()
  @MinLength(1)
  acceptedPrivacyVersion!: string;

  @IsBoolean()
  confirmedAdult!: true;

  @IsEnum(['en', 'sw'])
  locale!: 'en' | 'sw';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  @MinLength(8)
  deviceId!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}

export class LogoutDto extends RefreshTokenDto {}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}

export class EmailAddressDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  token!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
