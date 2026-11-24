import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { Scope } from '../common/access.service';
import { Period } from '../common/period';
import { scopeCondition } from '../common/scope-sql';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly metrics: MetricsService,
  ) {}

  /** Филиалы с показателями за период + общий итог по всем доступным */
  async listWithStats(scope: Scope, period: Period) {
    const params: unknown[] = [period.from, period.to];
    const where = scopeCondition(scope, params);

    const items = await this.db.query(
      `SELECT b.id, b.name, b.city, b.address,
              c.id AS "companyId", c.name AS "companyName",
              coalesce(m.views, 0)::int          AS "views",
              coalesce(m.website_clicks, 0)::int AS "websiteClicks",
              coalesce(m.calls, 0)::int          AS "calls",
              coalesce(m.routes, 0)::int         AS "routes",
              r.avg_rating                       AS "avgRating",
              coalesce(r.cnt, 0)::int            AS "reviewsCount"
         FROM branches b
         JOIN companies c ON c.id = b.company_id
         LEFT JOIN LATERAL (
           SELECT sum(views) views, sum(website_clicks) website_clicks, sum(calls) calls, sum(routes) routes
             FROM daily_metrics WHERE branch_id = b.id AND date BETWEEN $1 AND $2
         ) m ON true
         LEFT JOIN LATERAL (
           SELECT round(avg(rating), 2) avg_rating, count(*) cnt
             FROM reviews WHERE branch_id = b.id AND published_at >= $1::date AND published_at < $2::date + 1
         ) r ON true
        WHERE ${where}
        ORDER BY c.name, b.name`,
      params,
    );

    const total = await this.metrics.totals(scope, period);
    return { period, items, total };
  }

  async getOne(id: number) {
    const branch = await this.db.one(
      `SELECT b.id, b.name, b.city, b.address, c.id AS "companyId", c.name AS "companyName"
         FROM branches b JOIN companies c ON c.id = b.company_id
        WHERE b.id = $1`,
      [id],
    );
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }
}
