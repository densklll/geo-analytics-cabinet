import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { migrate } from '../src/db/migrate';
import { createPool } from '../src/db/pool';
import { setupApp } from '../src/setup-app';

// Тесты работают с отдельной базой и сами создают себе маленький набор данных,
// поэтому не зависят от сидов и от текущей даты.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/geo_test';

export const PASSWORD = 'secret';

export interface Fixture {
  companyA: number;
  companyB: number;
  branchA1: number;
  branchA2: number;
  branchB1: number;
  reviewB1: number;
}

export async function createTestApp() {
  const pool = createPool();
  await migrate(pool, () => undefined);
  const fixture = await loadFixture(pool);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return { app, pool, fixture };
}

export async function login(app: INestApplication, email: string) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return res.body.token as string;
}

async function loadFixture(pool: Pool): Promise<Fixture> {
  await pool.query('TRUNCATE reviews, daily_metrics, users, branches, companies RESTART IDENTITY CASCADE');
  const id = async (sql: string, params: unknown[]) => (await pool.query(sql, params)).rows[0].id as number;

  const companyA = await id(`INSERT INTO companies (name) VALUES ('Альфа') RETURNING id`, []);
  const companyB = await id(`INSERT INTO companies (name) VALUES ('Бета') RETURNING id`, []);
  const branch = (company: number, name: string) =>
    id(`INSERT INTO branches (company_id, name, city, address) VALUES ($1, $2, 'Город', 'ул. Тестовая, 1') RETURNING id`, [company, name]);
  const branchA1 = await branch(companyA, 'А-1');
  const branchA2 = await branch(companyA, 'А-2');
  const branchB1 = await branch(companyB, 'Б-1');

  const metrics: [number, string, number, number, number, number][] = [
    [branchA1, '2026-01-01', 100, 10, 5, 7],
    [branchA1, '2026-01-02', 200, 20, 6, 8],
    // 2026-01-03 у A1 нет данных: на графике должен быть 0
    [branchA2, '2026-01-01', 50, 5, 1, 2],
    [branchA2, '2026-01-03', 70, 7, 2, 3],
    [branchB1, '2026-01-01', 9999, 999, 99, 9],
  ];
  for (const m of metrics) {
    await pool.query(
      'INSERT INTO daily_metrics (branch_id, date, views, website_clicks, calls, routes) VALUES ($1, $2, $3, $4, $5, $6)',
      m,
    );
  }

  const review = (branchId: number, rating: number, status: string, at: string) =>
    id(
      `INSERT INTO reviews (branch_id, source, author_name, rating, text, status, published_at)
       VALUES ($1, 'yandex', 'Тест', $2, 'текст', $3, $4) RETURNING id`,
      [branchId, rating, status, at],
    );
  await review(branchA1, 5, 'new', '2026-01-01T10:00:00Z');
  await review(branchA1, 4, 'resolved', '2026-01-02T10:00:00Z');
  await review(branchA2, 1, 'new', '2026-01-03T10:00:00Z');
  const reviewB1 = await review(branchB1, 2, 'new', '2026-01-01T10:00:00Z');

  const hash = await bcrypt.hash(PASSWORD, 4);
  const user = (email: string, role: string, company: number | null) =>
    pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, company_id) VALUES ($1, $2, $1, $3, $4)`,
      [email, hash, role, company],
    );
  await user('admin@example.test', 'admin', null);
  await user('a@alpha.test', 'client', companyA);
  await user('b@beta.test', 'client', companyB);

  return { companyA, companyB, branchA1, branchA2, branchB1, reviewB1 };
}
