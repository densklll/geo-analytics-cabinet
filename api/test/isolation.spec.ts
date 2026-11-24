import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, Fixture, login } from './helpers';

describe('Изоляция данных компаний', () => {
  let app: INestApplication;
  let pool: Pool;
  let f: Fixture;
  let clientA: string;
  let admin: string;

  const period = 'from=2026-01-01&to=2026-01-03';
  const get = (url: string, token?: string) => {
    const req = request(app.getHttpServer()).get(url);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    ({ app, pool, fixture: f } = await createTestApp());
    clientA = await login(app, 'a@alpha.test');
    admin = await login(app, 'admin@example.test');
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('без токена API не отдает данные', async () => {
    await get('/api/branches').expect(401);
    await get('/api/metrics/summary', 'not-a-token').expect(401);
  });

  it('клиент видит только свою компанию и свои филиалы', async () => {
    const companies = await get('/api/companies', clientA).expect(200);
    expect(companies.body.map((c: { id: number }) => c.id)).toEqual([f.companyA]);

    const branches = await get(`/api/branches?${period}`, clientA).expect(200);
    const ids = branches.body.items.map((b: { id: number }) => b.id).sort();
    expect(ids).toEqual([f.branchA1, f.branchA2].sort());
    // в агрегате не должно быть 9999 просмотров компании Бета
    expect(branches.body.total.views).toBe(420);
  });

  it('прямой запрос к чужой компании или чужому филиалу отклоняется', async () => {
    await get(`/api/metrics/summary?companyId=${f.companyB}`, clientA).expect(403);
    await get(`/api/branches?companyId=${f.companyB}`, clientA).expect(403);
    await get(`/api/metrics/summary?branchId=${f.branchB1}`, clientA).expect(404);
    await get(`/api/metrics/timeseries?branchId=${f.branchB1}`, clientA).expect(404);
    await get(`/api/reviews?branchId=${f.branchB1}`, clientA).expect(404);
    await get(`/api/branches/${f.branchB1}`, clientA).expect(404);
  });

  it('клиент не видит и не может изменить чужие отзывы', async () => {
    const reviews = await get(`/api/reviews?${period}`, clientA).expect(200);
    expect(reviews.body.items.every((r: { branchId: number }) => r.branchId !== f.branchB1)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/reviews/${f.reviewB1}/status`)
      .set('Authorization', `Bearer ${clientA}`)
      .send({ status: 'resolved' })
      .expect(404);

    const { rows } = await pool.query('SELECT status FROM reviews WHERE id = $1', [f.reviewB1]);
    expect(rows[0].status).toBe('new');
  });

  it('администратор видит все компании и может сузить выборку', async () => {
    const companies = await get('/api/companies', admin).expect(200);
    expect(companies.body).toHaveLength(2);

    const all = await get(`/api/branches?${period}`, admin).expect(200);
    expect(all.body.items).toHaveLength(3);

    const onlyB = await get(`/api/metrics/summary?companyId=${f.companyB}&${period}`, admin).expect(200);
    expect(onlyB.body.current.views).toBe(9999);
  });
});
