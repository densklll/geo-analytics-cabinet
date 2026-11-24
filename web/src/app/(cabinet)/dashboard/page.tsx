'use client';

import { useState } from 'react';
import { Filters } from '@/components/Filters';
import { KpiCard } from '@/components/KpiCard';
import { MetricChart } from '@/components/MetricChart';
import { Empty, ErrorBox, Loader } from '@/components/States';
import { api } from '@/lib/api';
import { useFilters } from '@/lib/filters';
import { formatNumber, formatRating } from '@/lib/format';
import { MetricName, Summary, Timeseries } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const CHART_METRICS: { key: MetricName; label: string }[] = [
  { key: 'views', label: 'Просмотры' },
  { key: 'website_clicks', label: 'Переходы на сайт' },
  { key: 'calls', label: 'Звонки' },
  { key: 'routes', label: 'Маршруты' },
];

export default function DashboardPage() {
  const { filters, queryString } = useFilters();
  const [metric, setMetric] = useState<MetricName>('views');

  const summary = useApi(`summary:${queryString}`, () => api<Summary>('/metrics/summary', { query: { ...filters } }));
  const series = useApi(`series:${queryString}:${metric}`, () =>
    api<Timeseries>('/metrics/timeseries', { query: { ...filters, metric } }),
  );

  const c = summary.data?.current;
  const p = summary.data?.previous;
  const chartLabel = CHART_METRICS.find((m) => m.key === metric)!.label;

  return (
    <>
      <header className="page-head">
        <h1>Дашборд</h1>
        <p className="muted">Показатели карточек на Яндекс Картах, 2ГИС и Google Maps</p>
      </header>

      <Filters />

      {summary.error && <ErrorBox error={summary.error} onRetry={summary.reload} />}
      {!summary.data && summary.loading && <Loader />}

      {c && p && (
        <section className={`kpis ${summary.loading ? 'is-refreshing' : ''}`}>
          <KpiCard title="Просмотры карточек" value={formatNumber(c.views)} current={c.views} previous={p.views} />
          <KpiCard title="Переходы на сайт" value={formatNumber(c.websiteClicks)} current={c.websiteClicks} previous={p.websiteClicks} />
          <KpiCard title="Звонки" value={formatNumber(c.calls)} current={c.calls} previous={p.calls} />
          <KpiCard title="Построено маршрутов" value={formatNumber(c.routes)} current={c.routes} previous={p.routes} />
          <KpiCard title="Средний рейтинг" value={formatRating(c.avgRating)} current={c.avgRating} previous={p.avgRating} hint="нет отзывов за период" />
          <KpiCard title="Отзывов за период" value={formatNumber(c.reviewsCount)} current={c.reviewsCount} previous={p.reviewsCount} />
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Динамика: {chartLabel.toLowerCase()}</h2>
          <div className="segmented">
            {CHART_METRICS.map((m) => (
              <button key={m.key} className={metric === m.key ? 'active' : ''} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {series.error && <ErrorBox error={series.error} onRetry={series.reload} />}
        {!series.data && series.loading && <Loader />}
        {series.data &&
          (series.data.points.every((pt) => pt.value === 0) ? (
            <Empty>За выбранный период данных нет</Empty>
          ) : (
            <div className={series.loading ? 'is-refreshing' : ''}>
              <MetricChart points={series.data.points} label={chartLabel} />
            </div>
          ))}
      </section>
    </>
  );
}
