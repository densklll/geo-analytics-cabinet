import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { createPool } from './pool';

// Минимальный раннер: применяет по порядку файлы migrations/*.sql,
// которых еще нет в schema_migrations. Каждая миграция в своей транзакции.
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

export async function migrate(pool: Pool, log = console.log) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const applied = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
  );
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  const pool = createPool();
  migrate(pool)
    .then(() => console.log('migrations are up to date'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
