import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { DatabaseService } from '../db/database.service';

/**
 * Итоговая область данных для запроса.
 * companyId = null означает "все компании" (только для админа).
 */
export interface Scope {
  companyId: number | null;
  branchId: number | null;
}

/**
 * Единственное место, где решается, какие данные доступны пользователю.
 * Все сервисы строят SQL только от Scope, который вернул этот класс,
 * а не от сырых параметров запроса.
 */
@Injectable()
export class AccessService {
  constructor(private readonly db: DatabaseService) {}

  async resolveScope(user: AuthUser, requested: { companyId?: number; branchId?: number }): Promise<Scope> {
    const companyId = this.resolveCompany(user, requested.companyId);

    if (requested.branchId === undefined) {
      return { companyId, branchId: null };
    }

    const branch = await this.assertBranchAccess(user, requested.branchId);
    if (companyId !== null && branch.company_id !== companyId) {
      throw new NotFoundException('Филиал не найден');
    }
    return { companyId: branch.company_id, branchId: branch.id };
  }

  resolveCompany(user: AuthUser, requestedCompanyId?: number): number | null {
    if (user.role === 'admin') return requestedCompanyId ?? null;

    if (requestedCompanyId !== undefined && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('Нет доступа к данным этой компании');
    }
    return user.companyId;
  }

  /**
   * Для чужого филиала отвечаем 404, а не 403: клиенту незачем знать,
   * что филиал с таким id вообще существует.
   */
  async assertBranchAccess(user: AuthUser, branchId: number) {
    const branch = await this.db.one<{ id: number; company_id: number }>(
      'SELECT id, company_id FROM branches WHERE id = $1',
      [branchId],
    );
    if (!branch || (user.role !== 'admin' && branch.company_id !== user.companyId)) {
      throw new NotFoundException('Филиал не найден');
    }
    return branch;
  }
}
