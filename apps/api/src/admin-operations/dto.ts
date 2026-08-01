import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UserSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string;
}

export class UserSuspensionDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason!: string;
}

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;
}
