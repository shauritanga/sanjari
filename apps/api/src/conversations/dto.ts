import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
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
