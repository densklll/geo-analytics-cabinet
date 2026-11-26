'use client';

import { useEffect, useState } from 'react';
import { Filters } from '@/components/Filters';
import { Select } from '@/components/Select';
import { Stars } from '@/components/Stars';
import { Empty, ErrorBox, Loader } from '@/components/States';
import { api, buildQuery } from '@/lib/api';
import { useFilters } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import { Review, ReviewsResponse, ReviewStatus } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  resolved: 'Обработан',
};
const SOURCE_LABELS: Record<Review['source'], string> = { yandex: 'Яндекс', '2gis': '2ГИС', google: 'Google' };
const PAGE_SIZE = 10;

export default function ReviewsPage() {
  const { filters } = useFilters();
  const [ratings, setRatings] = useState<number[]>([]);
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const query = {
    ...filters,
    rating: ratings.length ? ratings.join(',') : undefined,
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, loading, reload, setData } = useApi(`reviews:${buildQuery(query)}`, () =>
    api<ReviewsResponse>('/reviews', { query }),
  );

  // при смене фильтров возвращаемся на первую страницу
  useEffect(() => setPage(1), [filters.companyId, filters.branchId, filters.from, filters.to]);

  const toggleRating = (r: number) => {
    setPage(1);
    setRatings((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r].sort()));
  };
  const selectStatus = (s: ReviewStatus | '') => {
    setPage(1);
    setStatus(s);
  };

  async function changeStatus(review: Review, next: ReviewStatus) {
    setSaving(review.id);
    setSaveError(null);
    try {
      const updated = await api<Review>(`/reviews/${review.id}/status`, { method: 'PATCH', body: { status: next } });
      if (data) {
        // если отзыв перестал подходить под фильтр статуса, проще перезапросить список
        if (status && status !== next) {
          reload();
        } else {
          const nextByStatus = { ...data.byStatus };
          if (review.status !== next) {
            nextByStatus[review.status] = Math.max(0, nextByStatus[review.status] - 1);
            nextByStatus[next] = nextByStatus[next] + 1;
          }
          setData({
            ...data,
            byStatus: nextByStatus,
            items: data.items.map((r) => (r.id === updated.id ? updated : r)),
          });
        }
      }
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const counts = data?.byStatus;
  const allCount = counts ? counts.new + counts.in_progress + counts.resolved : 0;

  return (
    <>
      <header className="page-head">
        <h1>Отзывы</h1>
        <p className="muted">Отзывы со всех площадок и статус их обработки</p>
      </header>

      <Filters />

      <div className="filters">
        <div className="field">
          <span>Оценка</span>
          <div className="segmented">
            {[5, 4, 3, 2, 1].map((r) => (
              <button key={r} className={ratings.includes(r) ? 'active' : ''} onClick={() => toggleRating(r)}>
                {r} ★
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Статус</span>
          <div className="segmented">
            <button className={status === '' ? 'active' : ''} onClick={() => selectStatus('')}>
              Все {counts && <em>{allCount}</em>}
            </button>
            {(Object.keys(STATUS_LABELS) as ReviewStatus[]).map((s) => (
              <button key={s} className={status === s ? 'active' : ''} onClick={() => selectStatus(s)}>
                {STATUS_LABELS[s]} {counts && <em>{counts[s]}</em>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveError && <div className="state state-error">Не удалось сменить статус: {saveError}</div>}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && loading && <Loader />}
      {data && data.items.length === 0 && <Empty>Отзывов по выбранным условиям нет</Empty>}

      {data && data.items.length > 0 && (
        <div className={`reviews ${loading ? 'is-refreshing' : ''}`}>
          {data.items.map((r) => (
            <article key={r.id} className="card review">
              <div className="review-head">
                <Stars value={r.rating} />
                <span className="strong">{r.authorName}</span>
                <span className="muted small">
                  {SOURCE_LABELS[r.source]} · {r.branchName} · {formatDate(r.publishedAt)}
                </span>
                <div className="review-status">
                  <Select
                    className={`status status-${r.status}`}
                    align="right"
                    value={r.status}
                    disabled={saving === r.id}
                    options={(Object.keys(STATUS_LABELS) as ReviewStatus[]).map((s) => ({
                      value: s,
                      label: STATUS_LABELS[s],
                      dotClass: `dot-${s}`,
                    }))}
                    onChange={(next) => changeStatus(r, next as ReviewStatus)}
                  />
                </div>
              </div>
              <p>{r.text}</p>
            </article>
          ))}

          <div className="pager">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Назад
            </button>
            <span className="muted">
              Страница {page} из {pages} · всего {data.total}
            </span>
            <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Вперед
            </button>
          </div>
        </div>
      )}
    </>
  );
}
