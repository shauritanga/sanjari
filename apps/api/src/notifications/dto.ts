import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PushTokenDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  provider!: string;
}

export class NotificationPreferenceDto {
  @IsString()
  @MaxLength(48)
  category!: string;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}
