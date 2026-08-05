import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  replyToMessageId?: string;
}

export class MessageHistoryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ReadReceiptDto {
  @IsString()
  @MinLength(1)
  messageId!: string;
}

export class DeliveredReceiptDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  messageIds!: string[];
}

export class ReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  reaction!: string;
}

export class AttachmentPresignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  mimeType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  sizeBytes!: string;
}

export class AttachmentCompleteDto {
  @IsString()
  @MinLength(8)
  storageKey!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  mimeType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  sizeBytes!: string;

  /** Normalized (0-1) amplitude samples captured while recording a voice note. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  waveform?: number[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  durationSeconds?: number;
}
