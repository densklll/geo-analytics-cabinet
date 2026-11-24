import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, Fixture, login } from './helpers';

describe('Метрики и отзывы', () => {
  let app: INestApplication;
  let pool: Pool;
  let f: Fixture;
  let token: string;

  const get = (url: string) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ({ app, pool, fixture: f } = await createTestApp());
    token = await login(app, 'a@alpha.test');
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('summary правильно суммирует метрики и не размножает их на отзывы', async () => {
    const res = await get('/api/metrics/summary?from=2026-01-01&to=2026-01-03').expect(200);
    expect(res.body.current).toEqual({
      views: 420,
      websiteClicks: 42,
      calls: 14,
      routes: 20,
      avgRating: 3.33,
      reviewsCount: 3,
    });
  });

  it('фильтр по филиалу и периоду', async () => {
    const res = await get(`/api/metrics/summary?branchId=${f.branchA1}&from=2026-01-02&to=2026-01-02`).expect(200);
    expect(res.body.current).toMatchObject({ views: 200, calls: 6, avgRating: 4, reviewsCount: 1 });
  });

  it('timeseries возвращает каждый день периода, пропуски заполнены нулями', async () => {
    const res = await get(`/api/metrics/timeseries?branchId=${f.branchA1}&from=2026-01-01&to=2026-01-03&metric=views`).expect(200);
    expect(res.body.points).toEqual([
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 200 },
      { date: '2026-01-03', value: 0 },
    ]);
  });

  it('отзывы фильтруются по рейтингу и статусу', async () => {
    const lowNew = await get('/api/reviews?from=2026-01-01&to=2026-01-03&rating=1,2&status=new').expect(200);
    expect(lowNew.body.total).toBe(1);
    expect(lowNew.body.items[0]).toMatchObject({ rating: 1, branchId: f.branchA2 });

    const resolved = await get('/api/reviews?from=2026-01-01&to=2026-01-03&status=resolved').expect(200);
    expect(resolved.body.items.map((r: { rating: number }) => r.rating)).toEqual([4]);
    expect(resolved.body.byStatus).toEqual({ new: 2, in_progress: 0, resolved: 1 });
  });

  it('некорректные параметры дают 400, а не 500', async () => {
    await get('/api/metrics/timeseries?metric=drop_table').expect(400);
    await get('/api/metrics/summary?from=2026-02-01&to=2026-01-01').expect(400);
    await get('/api/reviews?rating=7').expect(400);
  });
});
