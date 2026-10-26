import { PGlite } from '@electric-sql/pglite';
export type DbResult = { rows: any[]; rowCount?: number | null };
export interface DbClient { query(sql: string, params?: any[]): Promise<DbResult>; release(): void }
export interface DbPool { query(sql: string, params?: any[]): Promise<DbResult>; connect(): Promise<DbClient>; end(): Promise<void> }
// Keep a whole transaction exclusive, not just individual statements.
export class EmbeddedPool implements DbPool {
  private readonly database: PGlite;
  private queue: Promise<void> = Promise.resolve();
  constructor(path: string) { this.database = new PGlite(path); }
  private async acquire() {
    let unlock!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    return unlock;
  }
  private async execute(sql: string, params?: any[]): Promise<DbResult> {
    if (params === undefined) {
      const results = await this.database.exec(sql);
      return { rows: results.at(-1)?.rows ?? [] };
    }
    return this.database.query(sql, params);
  }
  async query(sql: string, params?: any[]) {
    const unlock = await this.acquire();
    try { return await this.execute(sql, params); } finally { unlock(); }
  }
  async connect(): Promise<DbClient> {
    const unlock = await this.acquire();
    let released = false;
    return { query: (sql, params) => this.execute(sql, params), release() { if (!released) { released = true; unlock(); } } };
  }
  async end() { const unlock = await this.acquire(); try { await this.database.close(); } finally { unlock(); } }
}
