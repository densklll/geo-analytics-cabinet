'use client';

import { useRouter } from 'next/navigation';
import { Filters } from '@/components/Filters';
import { Empty, ErrorBox, Loader } from '@/components/States';
import { api, buildQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { formatNumber, formatRating } from '@/lib/format';
import { BranchesResponse, Totals } from '@/lib/types';
import { useApi } from '@/lib/useApi';

function MetricCells({ row }: { row: Totals }) {
  return (
    <>
      <td className="num">{formatNumber(row.views)}</td>
      <td className="num">{formatNumber(row.websiteClicks)}</td>
      <td className="num">{formatNumber(row.calls)}</td>
      <td className="num">{formatNumber(row.routes)}</td>
      <td className="num">{formatRating(row.avgRating)}</td>
      <td className="num">{formatNumber(row.reviewsCount)}</td>
    </>
  );
}

export default function BranchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { filters } = useFilters();
  const query = { companyId: filters.companyId, from: filters.from, to: filters.to };

  const { data, error, loading, reload } = useApi(`branches:${buildQuery(query)}`, () =>
    api<BranchesResponse>('/branches', { query }),
  );

  const openBranch = (branchId: number) =>
    router.push(`/dashboard${buildQuery({ ...query, branchId })}`);

  return (
    <>
      <header className="page-head">
        <h1>Филиалы</h1>
        <p className="muted">Нажмите на филиал, чтобы открыть его статистику на дашборде</p>
      </header>

      <Filters showBranch={false} />

      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && loading && <Loader />}
      {data && data.items.length === 0 && <Empty>Филиалов пока нет</Empty>}

      {data && data.items.length > 0 && (
        <div className={`card table-wrap ${loading ? 'is-refreshing' : ''}`}>
          <table className="table">
            <thead>
              <tr>
                <th>Филиал</th>
                {user?.role === 'admin' && <th>Компания</th>}
                <th className="num">Просмотры</th>
                <th className="num">Сайт</th>
                <th className="num">Звонки</th>
                <th className="num">Маршруты</th>
                <th className="num">Рейтинг</th>
                <th className="num">Отзывы</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b.id} className="clickable" onClick={() => openBranch(b.id)}>
                  <td>
                    <div className="strong">{b.name}</div>
                    <div className="muted small">
                      {b.city}, {b.address}
                    </div>
                  </td>
                  {user?.role === 'admin' && <td>{b.companyName}</td>}
                  <MetricCells row={b} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="strong">Итого по {data.items.length} филиалам</td>
                {user?.role === 'admin' && <td />}
                <MetricCells row={data.total} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
