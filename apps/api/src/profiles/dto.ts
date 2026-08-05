import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsBoolean,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OnboardingUpdateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  step?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pronouns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interestedIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  relationshipIntentions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  biography?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupationCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  educationLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cityId?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  drinkingPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  smokingPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  exercisePreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  childrenPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  culturalPreference?: string;

  @IsOptional()
  @IsBoolean()
  hideAge?: boolean;

  @IsOptional()
  @IsBoolean()
  hideOnlineStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  hideReadReceipts?: boolean;

  @IsOptional()
  @IsBoolean()
  hideCity?: boolean;

  @IsOptional()
  @IsBoolean()
  hideOccupation?: boolean;

  @IsOptional()
  @IsBoolean()
  hideEducation?: boolean;

  @IsOptional()
  @IsBoolean()
  hideHeight?: boolean;
}

export class PhotoPresignDto {
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}

export class PhotoCompleteDto {
  @IsString()
  @MinLength(8)
  storageKey!: string;
}

export class PhotoReplaceDto {
  @IsString()
  @MinLength(8)
  storageKey!: string;
}

export class PhotoReorderDto {
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  photoIds!: string[];
}

export class DiscoveryPauseDto {
  @IsBoolean()
  paused!: boolean;
}

export class PromptAnswerDto {
  @IsUUID()
  promptId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  answer!: string;
}

export class PromptAnswersDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PromptAnswerDto)
  answers!: PromptAnswerDto[];
}

export class DiscoveryPreferenceDto {
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  maxAge?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxDistanceKm?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  genders?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  intentions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];

  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  showDistance?: boolean;
}

export class VoiceIntroPresignDto {
  @IsString()
  @IsIn(['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'])
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(15 * 1024 * 1024)
  sizeBytes!: number;
}

export class VoiceIntroCompleteDto {
  @IsString()
  @MinLength(8)
  storageKey!: string;
}

export class VerificationPresignDto {
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(8 * 1024 * 1024)
  sizeBytes!: number;
}

export class VerificationSubmitDto {
  @IsString()
  @MinLength(8)
  storageKey!: string;
}

export class ChaperoneContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  relationship!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  forwardEnabled?: boolean;
}

export class VisibilityModeDto {
  @IsIn(['everyone', 'liked_only'])
  mode!: 'everyone' | 'liked_only';
}
