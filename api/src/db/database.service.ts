import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';
import { createPool } from './pool';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool = createPool();

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
