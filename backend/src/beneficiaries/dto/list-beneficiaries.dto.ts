import { IsIn, IsOptional } from 'class-validator';
import type { BeneficiaryType } from './create-beneficiary.dto.js';

export class ListBeneficiariesDto {
  @IsOptional()
  @IsIn(['seller', 'affiliate', 'agency'])
  type?: BeneficiaryType;

  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}
