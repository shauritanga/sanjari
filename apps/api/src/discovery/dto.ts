import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
