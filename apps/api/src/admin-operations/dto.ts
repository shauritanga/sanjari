import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

export class RoleAssignmentDto {
  @IsString()
  roleId!: string;
}

export class FeatureFlagUpdateDto {
  @IsBoolean()
  enabled!: boolean;
}

export class VerificationReviewDto {
  @IsString()
  @MaxLength(40)
  status!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason!: string;
}
