import {
  IsString, IsEmail, IsInt, IsOptional, IsDateString,
  MaxLength, IsBoolean, Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsString() @MaxLength(150)
  firstName: string;

  @IsString() @MaxLength(150)
  lastName: string;

  @IsEmail() @MaxLength(191)
  email: string;

  @IsInt() @Min(1)
  @Type(() => Number)
  idType: number;

  @IsString() @MaxLength(30)
  idNumber: string;

  @IsDateString()
  fechaNacimiento: string;

  @IsString() @MaxLength(20)
  gender: string;

  @IsInt() @Min(1)
  @Type(() => Number)
  idcountry_citizenship: number;

  @IsOptional() @IsInt()
  @Type(() => Number)
  idcountry_residence?: number;

  @IsOptional() @IsString() @MaxLength(30)
  mobile?: string;

  @IsOptional() @IsString() @MaxLength(20)
  usa_mobile?: string;

  @IsOptional() @IsString() @MaxLength(20)
  visaType?: string;

  @IsOptional() @IsString() @MaxLength(100)
  nombreSaludo?: string;

  @IsOptional() @IsString() @MaxLength(100)
  source?: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsInt()
  @Type(() => Number)
  assignedTo?: number;
}
