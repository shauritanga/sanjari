import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PurchaseWebhookDto {
  @IsIn(['apple', 'google', 'local'])
  provider!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  signature!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  productCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  transactionId!: string;

  @IsString()
  userId!: string;

  @IsIn(['active', 'trialing', 'grace_period', 'cancelled', 'refunded', 'expired'])
  status!: string;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
