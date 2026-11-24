import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { DatabaseService } from '../db/database.service';
import { Scope } from '../common/access.service';
import { Period } from '../common/period';
import { scopeCondition } from '../common/scope-sql';
import { ReviewStatus } from './reviews.dto';

interface ReviewFilters {
  rating?: number[];
  status?: ReviewStatus;
  page: number;
  pageSize: number;
}

const REVIEW_COLUMNS = `
  rv.id::int, rv.source, rv.author_name AS "authorName", rv.rating, rv.text, rv.status,
  rv.published_at AS "publishedAt", rv.updated_at AS "updatedAt",
  b.id AS "branchId", b.name AS "branchName"`;

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  async list(scope: Scope, period: Period, filters: ReviewFilters) {
    const params: unknown[] = [period.from, period.to];
    const baseWhere = `${scopeCondition(scope, params)}
      AND rv.published_at >= $1::date AND rv.published_at < $2::date + 1`;

    // счетчики по статусам считаем без фильтра по статусу, чтобы в табах
    // всегда были видны цифры по всем статусам
    const countParams = [...params];
    let ratingCondition = '';
    if (filters.rating?.length) {
      params.push(filters.rating);
      ratingCondition = ` AND rv.rating = ANY($${params.length}::int[])`;
      countParams.push(filters.rating);
    }

    let where = baseWhere + ratingCondition;
    if (filters.status) {
      params.push(filters.status);
      where += ` AND rv.status = $${params.length}`;
    }

    const offset = (filters.page - 1) * filters.pageSize;
    const [items, totalRow, statusRows] = await Promise.all([
      this.db.query(
        `SELECT ${REVIEW_COLUMNS}
           FROM reviews rv JOIN branches b ON b.id = rv.branch_id
          WHERE ${where}
          ORDER BY rv.published_at DESC, rv.id DESC
          LIMIT ${filters.pageSize} OFFSET ${offset}`,
        params,
      ),
      this.db.one<{ total: number }>(
        `SELECT count(*)::int AS total FROM reviews rv JOIN branches b ON b.id = rv.branch_id WHERE ${where}`,
        params,
      ),
      this.db.query<{ status: ReviewStatus; count: number }>(
        `SELECT rv.status, count(*)::int AS count
           FROM reviews rv JOIN branches b ON b.id = rv.branch_id
          WHERE ${baseWhere + ratingCondition}
          GROUP BY rv.status`,
        countParams,
      ),
    ]);

    const byStatus = { new: 0, in_progress: 0, resolved: 0 };
    for (const row of statusRows) byStatus[row.status] = row.count;

    return { items, total: totalRow?.total ?? 0, page: filters.page, pageSize: filters.pageSize, byStatus };
  }

  /** Обновление идет одним запросом с проверкой компании прямо в WHERE */
  async updateStatus(user: AuthUser, id: number, status: ReviewStatus) {
    const companyId = user.role === 'admin' ? null : user.companyId;
    const updated = await this.db.one<{ id: number }>(
      `UPDATE reviews rv SET status = $2, updated_at = now()
         FROM branches b
        WHERE rv.id = $1 AND b.id = rv.branch_id AND ($3::int IS NULL OR b.company_id = $3)
        RETURNING rv.id`,
      [id, status, companyId],
    );
    if (!updated) throw new NotFoundException('Отзыв не найден');

    return this.db.one(
      `SELECT ${REVIEW_COLUMNS} FROM reviews rv JOIN branches b ON b.id = rv.branch_id WHERE rv.id = $1`,
      [id],
    );
  }
}
