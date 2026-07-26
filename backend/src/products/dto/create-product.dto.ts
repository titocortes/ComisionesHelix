import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  helixProductId?: number;

  @IsString()
  @MaxLength(150)
  productName!: string;

  @IsString()
  @MaxLength(20)
  shortName!: string;
}
