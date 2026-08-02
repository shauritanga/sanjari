import {
  IsArray,
  ArrayMaxSize,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class OnboardingUpdateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(22)
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
