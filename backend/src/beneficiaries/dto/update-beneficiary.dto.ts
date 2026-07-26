import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
