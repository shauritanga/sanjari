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
}
