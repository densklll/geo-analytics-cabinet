import * as bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';
import { migrate } from './migrate';
import { createPool } from './pool';

// Все данные вымышленные. Генератор детерминированный (фиксированный seed),
// поэтому после пересоздания базы цифры на дашборде те же самые.
const DAYS = 120;

const companies = [
  {
    name: 'Кофейня «Сова»',
    branches: [
      { name: 'Сова на Пушкинской', city: 'Ростов-на-Дону', address: 'ул. Пушкинская, 120', base: 420 },
      { name: 'Сова у Театральной', city: 'Ростов-на-Дону', address: 'Театральный пр., 45', base: 310 },
      { name: 'Сова на Красной', city: 'Краснодар', address: 'ул. Красная, 88', base: 260 },
    ],
  },
  {
    name: 'Автосервис «Гайка»',
    branches: [
      { name: 'Гайка Север', city: 'Волгодонск', address: 'ул. Энтузиастов, 17', base: 150 },
      { name: 'Гайка Юг', city: 'Волгодонск', address: 'Жуковское ш., 3', base: 110 },
    ],
  },
];

const users = [
  { email: 'admin@demo.local', password: 'admin123', fullName: 'Анна Админова', role: 'admin', company: null },
  { email: 'owner@sova.demo', password: 'sova123', fullName: 'Олег Совин', role: 'client', company: 0 },
  { email: 'owner@gaika.demo', password: 'gaika123', fullName: 'Марина Гайкина', role: 'client', company: 1 },
] as const;

const authors = ['Ирина К.', 'Павел', 'Светлана М.', 'Дмитрий', 'Алина', 'Сергей П.', 'Наталья', 'Артем', 'Кирилл В.', 'Оксана'];
const textsByRating: Record<number, string[]> = {
  5: ['Все отлично, приду еще', 'Быстро и вежливо, спасибо', 'Лучшее место в районе', 'Очень понравилось обслуживание'],
  4: ['В целом хорошо, но пришлось подождать', 'Хорошо, цены чуть выше ожидаемого', 'Неплохо, рекомендую'],
  3: ['Средне, ничего особенного', 'Нормально, но есть что улучшить'],
  2: ['Долго ждал, персонал не извинился', 'Ожидал большего за эти деньги'],
  1: ['Очень плохой опыт, больше не приду', 'Нагрубили, просил книгу жалоб'],
};
const sources = ['yandex', '2gis', 'google'] as const;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function weightedRating(rand: () => number) {
  const r = rand();
  if (r < 0.55) return 5;
  if (r < 0.78) return 4;
  if (r < 0.88) return 3;
  if (r < 0.95) return 2;
  return 1;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function insertAll(client: PoolClient) {
  const rand = mulberry32(42);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const companyIds: number[] = [];

  for (const company of companies) {
    const { rows } = await client.query<{ id: number }>(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id',
      [company.name],
    );
    companyIds.push(rows[0].id);

    for (const branch of company.branches) {
      const { rows: [b] } = await client.query<{ id: number }>(
        'INSERT INTO branches (company_id, name, city, address) VALUES ($1, $2, $3, $4) RETURNING id',
        [rows[0].id, branch.name, branch.city, branch.address],
      );

      const metricRows: unknown[][] = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const day = new Date(today.getTime() - i * 86_400_000);
        const weekday = day.getUTCDay();
        const weekend = weekday === 0 || weekday === 6 ? 1.25 : 1;
        const trend = 1 + (DAYS - i) / DAYS / 4; // плавный рост ~25% за период
        const views = Math.round(branch.base * weekend * trend * (0.8 + rand() * 0.4));
        metricRows.push([
          b.id,
          isoDate(day),
          views,
          Math.round(views * (0.04 + rand() * 0.03)),
          Math.round(views * (0.02 + rand() * 0.02)),
          Math.round(views * (0.06 + rand() * 0.04)),
        ]);
      }
      await bulkInsert(
        client,
        'daily_metrics',
        ['branch_id', 'date', 'views', 'website_clicks', 'calls', 'routes'],
        metricRows,
      );

      const reviewRows: unknown[][] = [];
      const reviewCount = 25 + Math.floor(rand() * 20);
      for (let n = 0; n < reviewCount; n++) {
        const ageDays = Math.floor(rand() * DAYS);
        const publishedAt = new Date(today.getTime() - ageDays * 86_400_000 + Math.floor(rand() * 86_400_000));
        const rating = weightedRating(rand);
        // старые отзывы в основном уже обработаны, свежие висят новыми
        const status = ageDays > 14 ? (rand() < 0.85 ? 'resolved' : 'in_progress') : rand() < 0.6 ? 'new' : 'in_progress';
        reviewRows.push([b.id, pick(rand, sources), pick(rand, authors), rating, pick(rand, textsByRating[rating]), status, publishedAt]);
      }
      await bulkInsert(
        client,
        'reviews',
        ['branch_id', 'source', 'author_name', 'rating', 'text', 'status', 'published_at'],
        reviewRows,
      );
    }
  }

  for (const user of users) {
    await client.query(
      'INSERT INTO users (email, password_hash, full_name, role, company_id) VALUES ($1, $2, $3, $4, $5)',
      [user.email, await bcrypt.hash(user.password, 10), user.fullName, user.role, user.company === null ? null : companyIds[user.company]],
    );
  }
}

async function bulkInsert(client: PoolClient, table: string, columns: string[], rows: unknown[][]) {
  if (!rows.length) return;
  const params: unknown[] = [];
  const values = rows.map((row) => {
    const placeholders = row.map((value) => {
      params.push(value);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}`, params);
}

export async function seed(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE reviews, daily_metrics, users, branches, companies RESTART IDENTITY CASCADE');
    await insertAll(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function isEmpty(pool: Pool) {
  const { rows } = await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM companies');
  return rows[0].count === 0;
}

// --if-empty используется при старте контейнера: демо-данные создаются один раз
// и не затирают изменения (например, статусы отзывов) при перезапуске.
if (require.main === module) {
  const onlyIfEmpty = process.argv.includes('--if-empty');
  const pool = createPool();
  migrate(pool)
    .then(async () => {
      if (onlyIfEmpty && !(await isEmpty(pool))) {
        console.log('database already has data, seed skipped');
        return;
      }
      await seed(pool);
      console.log('seed done: 2 companies, 5 branches, 3 users');
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
