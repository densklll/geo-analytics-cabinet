import { Scope } from './access.service';

/**
 * Условие на таблицу branches (алиас b) для заданного Scope.
 * Параметры добавляются в конец переданного массива.
 */
export function scopeCondition(scope: Scope, params: unknown[]): string {
  params.push(scope.companyId, scope.branchId);
  const c = params.length - 1;
  const b = params.length;
  return `($${c}::int IS NULL OR b.company_id = $${c}) AND ($${b}::int IS NULL OR b.id = $${b})`;
}
