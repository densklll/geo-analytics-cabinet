import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessService } from '../common/access.service';
import { resolvePeriod } from '../common/period';
import { ReviewsQueryDto, UpdateReviewStatusDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly access: AccessService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ReviewsQueryDto) {
    const scope = await this.access.resolveScope(user, query);
    return this.reviews.list(scope, resolvePeriod(query.from, query.to), {
      rating: query.rating,
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviews.updateStatus(user, id, dto.status);
  }
}
