import { IsIn, IsOptional, IsString } from 'class-validator';

export class PaymentTrackingQueryDto {
  @IsOptional()
  @IsString()
  coverageMonth?: string; // YYYY-MM

  @IsOptional()
  @IsString()
  @IsIn(['authorized', 'payment_sent', 'paid', 'rejected', 'all'])
  status?: 'authorized' | 'payment_sent' | 'paid' | 'rejected' | 'all';

  @IsOptional()
  @IsString()
  beneficiary?: string;
}

export class BeneficiarySummaryQueryDto {
  @IsOptional()
  @IsString()
  coverageMonth?: string; // YYYY-MM

  @IsOptional()
  @IsString()
  @IsIn(['seller', 'affiliate', 'agency', 'all'])
  type?: string;
}

export class BatchesQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // YYYY-MM — filtro sobre processedAt del batch
}
