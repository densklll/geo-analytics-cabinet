import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessService } from '../common/access.service';
import { resolvePeriod } from '../common/period';
import { PeriodQueryDto } from '../common/scope-query.dto';
import { METRICS, MetricName, MetricsService } from './metrics.service';

class TimeseriesQueryDto extends PeriodQueryDto {
  @IsOptional()
  @IsIn(METRICS, { message: `metric должен быть одним из: ${METRICS.join(', ')}` })
  metric?: MetricName;
}

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly access: AccessService,
  ) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser, @Query() query: PeriodQueryDto) {
    const scope = await this.access.resolveScope(user, query);
    return this.metrics.summary(scope, resolvePeriod(query.from, query.to));
  }

  @Get('timeseries')
  async timeseries(@CurrentUser() user: AuthUser, @Query() query: TimeseriesQueryDto) {
    const scope = await this.access.resolveScope(user, query);
    const metric = query.metric ?? 'views';
    const points = await this.metrics.timeseries(scope, resolvePeriod(query.from, query.to), metric);
    return { metric, points };
  }
}
