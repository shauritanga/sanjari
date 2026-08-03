import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
