import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertDiscountDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  dependentNumber!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPercentage!: number;

  @IsOptional()
  @IsBoolean()
  orMore?: boolean;
}
