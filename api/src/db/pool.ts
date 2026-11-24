import { Pool, types } from 'pg';

// DATE отдаем строкой 'YYYY-MM-DD', иначе pg превращает его в Date
// в локальной таймзоне процесса и даты на графике "съезжают".
types.setTypeParser(types.builtins.DATE, (value) => value);
// NUMERIC (avg и round) приводим к числу, для наших значений точности хватает.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

export function createPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/geo',
    max: Number(process.env.DB_POOL_SIZE ?? 10),
  });
}
