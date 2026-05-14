import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryClientDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional() @IsString()
  sortBy?: string = 'lastName';

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
