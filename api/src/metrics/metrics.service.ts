import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { Scope } from '../common/access.service';
import { Period, previousPeriod } from '../common/period';
import { scopeCondition } from '../common/scope-sql';

export const METRICS = ['views', 'website_clicks', 'calls', 'routes'] as const;
export type MetricName = (typeof METRICS)[number];

export interface Totals {
  views: number;
  websiteClicks: number;
  calls: number;
  routes: number;
  avgRating: number | null;
  reviewsCount: number;
}

@Injectable()
export class MetricsService {
  constructor(private readonly db: DatabaseService) {}

  async summary(scope: Scope, period: Period) {
    const prev = previousPeriod(period);
    const [current, previous] = await Promise.all([this.totals(scope, period), this.totals(scope, prev)]);
    return { period, current, previous: { period: prev, ...previous } };
  }

  async totals(scope: Scope, period: Period): Promise<Totals> {
    const params: unknown[] = [period.from, period.to];
    const where = scopeCondition(scope, params);

    // Метрики и отзывы считаем отдельными подзапросами: если сделать один JOIN,
    // каждая строка метрик размножится на число отзывов и суммы будут неверными.
    const row = await this.db.one<Totals>(
      `SELECT
         coalesce(m.views, 0)::int          AS "views",
         coalesce(m.website_clicks, 0)::int AS "websiteClicks",
         coalesce(m.calls, 0)::int          AS "calls",
         coalesce(m.routes, 0)::int         AS "routes",
         r.avg_rating                       AS "avgRating",
         coalesce(r.cnt, 0)::int            AS "reviewsCount"
       FROM
         (SELECT sum(dm.views) views, sum(dm.website_clicks) website_clicks,
                 sum(dm.calls) calls, sum(dm.routes) routes
            FROM daily_metrics dm
            JOIN branches b ON b.id = dm.branch_id
           WHERE ${where} AND dm.date BETWEEN $1 AND $2) m,
         (SELECT round(avg(rv.rating), 2) avg_rating, count(*) cnt
            FROM reviews rv
            JOIN branches b ON b.id = rv.branch_id
           WHERE ${where} AND rv.published_at >= $1::date AND rv.published_at < $2::date + 1) r`,
      params,
    );
    return row!;
  }

  /** Ряд по дням без пропусков: дни без данных возвращаются нулями */
  timeseries(scope: Scope, period: Period, metric: MetricName) {
    const params: unknown[] = [period.from, period.to];
    const where = scopeCondition(scope, params);
    // metric берется только из белого списка METRICS, поэтому подставлять в SQL безопасно
    return this.db.query<{ date: string; value: number }>(
      `SELECT d::date::text AS date, coalesce(sum(dm.${metric}), 0)::int AS value
         FROM generate_series($1::date, $2::date, interval '1 day') d
         LEFT JOIN (daily_metrics dm JOIN branches b ON b.id = dm.branch_id AND ${where})
           ON dm.date = d::date
        GROUP BY d
        ORDER BY d`,
      params,
    );
  }
}
