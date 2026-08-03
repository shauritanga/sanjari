import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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

export class SupportTicketUpdateDto {
  @IsIn(['open', 'pending', 'resolved', 'closed'])
  status!: string;

  @IsIn(['normal', 'high', 'urgent'])
  priority!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason!: string;
}

export class NotificationUpdateDto {
  @IsIn(['read', 'unread'])
  status!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason!: string;
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

export class ContentPromptCreateDto {
  @IsIn(['en', 'sw'])
  locale!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(300)
  prompt!: string;
}

export class ContentPromptUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(300)
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class MatchingConfigUpdateDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  sharedInterestWeight!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  sharedInterestCap!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  completenessWeight!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  verificationBonus!: number;
}

export class LegalDocumentCreateDto {
  @IsIn(['terms', 'privacy', 'guidelines'])
  type!: string;

  @IsString()
  @MaxLength(20)
  version!: string;

  @IsIn(['en', 'sw'])
  locale!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  contentHash!: string;
}

export class DeletionRequestActionDto {
  @IsIn(['cancel', 'expedite'])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AppVersionUpdateDto {
  @IsIn(['ios', 'android'])
  platform!: string;

  @IsString()
  @MaxLength(20)
  minSupportedVersion!: string;

  @IsString()
  @MaxLength(20)
  latestVersion!: string;

  @IsBoolean()
  forceUpdate!: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  releaseNotes?: string;
}
