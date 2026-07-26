import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type BeneficiaryType = 'seller' | 'affiliate' | 'agency';

export class CreateBeneficiaryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsIn(['seller', 'affiliate', 'agency'])
  beneficiaryType!: BeneficiaryType;

  @IsInt()
  @Min(1)
  helixEntityId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idUser?: number;
}
