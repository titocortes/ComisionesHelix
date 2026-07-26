import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CancelCommissionDto {
  @IsInt()
  @Min(1)
  idCancellationReason!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
