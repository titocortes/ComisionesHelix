import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertCommissionRateDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlySellerAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyAffiliateAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyAgencyAmount!: number;
}
