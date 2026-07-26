import { IsIn, IsOptional, IsString } from 'class-validator';

export type AgeSegment = 'new' | 'in_progress' | 'upcoming_authorization';

export class ReviewQueryDto {
  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  seller?: string;

  @IsOptional()
  @IsString()
  client?: string;

  @IsOptional()
  @IsIn(['new', 'in_progress', 'upcoming_authorization'])
  ageSegment?: AgeSegment;
}
