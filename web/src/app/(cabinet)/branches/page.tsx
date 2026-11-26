'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filters } from '@/components/Filters';
import { Empty, ErrorBox, Loader } from '@/components/States';
import { api, buildQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { formatNumber, formatRating } from '@/lib/format';
import { BranchesResponse, BranchStats, Totals } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type SortKey = 'name' | 'views' | 'websiteClicks' | 'calls' | 'routes' | 'avgRating' | 'reviewsCount';

function pluralBranches(n: number) {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod10 === 1 && mod100 !== 11) return `${n} филиалу`;
  return `${n} филиалам`;
}

function downloadCsv(rows: BranchStats[], total: Totals, from: string, to: string, includeCompany: boolean) {
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    'Филиал',
    'Город',
    'Адрес',
    ...(includeCompany ? ['Компания'] : []),
    'Просмотры',
    'Переходы на сайт',
    'Звонки',
    'Маршруты',
    'Средний рейтинг',
    'Отзывы',
  ];
  const lines = [
    header.join(';'),
    ...rows.map((b) =>
      [
        b.name,
        b.city,
        b.address,
        ...(includeCompany ? [b.companyName] : []),
        b.views,
        b.websiteClicks,
        b.calls,
        b.routes,
        b.avgRating ?? '',
        b.reviewsCount,
      ]
        .map(esc)
        .join(';'),
    ),
    [
      'Итого',
      '',
      '',
      ...(includeCompany ? [''] : []),
      total.views,
      total.websiteClicks,
      total.calls,
      total.routes,
      total.avgRating ?? '',
      total.reviewsCount,
    ]
      .map(esc)
      .join(';'),
  ];

  // UTF-8 BOM нужен, чтобы Excel корректно открывал кириллицу
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `branches-${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const query = { companyId: filters.companyId, from: filters.from, to: filters.to };

  const { data, error, loading, reload } = useApi(`branches:${buildQuery(query)}`, () =>
    api<BranchesResponse>('/branches', { query }),
  );

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const copy = [...data.items];
    copy.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ru') * mul;
      const av = a[sortKey] ?? -1;
      const bv = b[sortKey] ?? -1;
      return (av - bv) * mul;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortMark = (key: SortKey) => (sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '');

  const openBranch = (branchId: number) =>
    router.push(`/dashboard${buildQuery({ ...query, branchId })}`);

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Филиалы</h1>
          <p className="muted">Нажмите на филиал, чтобы открыть его статистику на дашборде</p>
        </div>
        {data && data.items.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => downloadCsv(sortedItems, data.total, filters.from, filters.to, user?.role === 'admin')}
          >
            Экспорт CSV
          </button>
        )}
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
                <th>
                  <button className="th-sort" onClick={() => toggleSort('name')}>
                    Филиал{sortMark('name')}
                  </button>
                </th>
                {user?.role === 'admin' && <th>Компания</th>}
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('views')}>
                    Просмотры{sortMark('views')}
                  </button>
                </th>
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('websiteClicks')}>
                    Сайт{sortMark('websiteClicks')}
                  </button>
                </th>
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('calls')}>
                    Звонки{sortMark('calls')}
                  </button>
                </th>
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('routes')}>
                    Маршруты{sortMark('routes')}
                  </button>
                </th>
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('avgRating')}>
                    Рейтинг{sortMark('avgRating')}
                  </button>
                </th>
                <th className="num">
                  <button className="th-sort" onClick={() => toggleSort('reviewsCount')}>
                    Отзывы{sortMark('reviewsCount')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((b) => (
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
                <td className="strong">Итого по {pluralBranches(data.items.length)}</td>
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
