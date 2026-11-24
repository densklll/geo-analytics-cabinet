import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PeriodQueryDto } from '../common/scope-query.dto';

export const REVIEW_STATUSES = ['new', 'in_progress', 'resolved'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ?rating=1,2 или ?rating=1&rating=2 -> [1, 2]
const toNumberList = ({ value }: { value: unknown }) =>
  (Array.isArray(value) ? value : String(value).split(','))
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map(Number);

export class ReviewsQueryDto extends PeriodQueryDto {
  @IsOptional()
  @Transform(toNumberList)
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  rating?: number[];

  @IsOptional()
  @IsIn(REVIEW_STATUSES, { message: `status должен быть одним из: ${REVIEW_STATUSES.join(', ')}` })
  status?: ReviewStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UpdateReviewStatusDto {
  @IsIn(REVIEW_STATUSES, { message: `status должен быть одним из: ${REVIEW_STATUSES.join(', ')}` })
  status: ReviewStatus;
}
