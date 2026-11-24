import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class ScopeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;
}

export class PeriodQueryDto extends ScopeQueryDto {
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'from должен быть датой YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true }, { message: 'to должен быть датой YYYY-MM-DD' })
  to?: string;
}
