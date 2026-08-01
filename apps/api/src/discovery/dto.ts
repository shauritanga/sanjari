import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class DiscoveryQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  cursor?: string;

  @IsOptional()
  @IsString()
  @IsIn(['card', 'list'])
  view?: 'card' | 'list';
}

export class LikeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  priority?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class PassDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class UndoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  targetUserId?: string;
}

export class ProtectedLocationDto {
  @IsString()
  @MinLength(9)
  protectedPointWkt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  approximateCity?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  accuracyMeters?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  source!: string;
}
