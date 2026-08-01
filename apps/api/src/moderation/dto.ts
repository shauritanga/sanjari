import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const reportCategories = [
  'harassment',
  'scam',
  'impersonation',
  'unsafe_meeting',
  'underage_concern',
  'sexual_content',
  'spam',
  'other',
] as const;

export class BlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ReportEvidenceDto {
  @IsString()
  @IsIn(['message', 'profile', 'photo', 'voice', 'payment', 'other'])
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  referenceId!: string;
}

export class ReportDto {
  @IsString()
  reportedUserId!: string;

  @IsIn(reportCategories)
  category!: (typeof reportCategories)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  evidence?: ReportEvidenceDto[];
}

export class AppealDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2_000)
  statement!: string;
}
