import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { EmbeddedPool, type DbPool } from './embedded-pool';

export const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY,
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS answers (
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id integer NOT NULL CHECK (question_id BETWEEN 1 AND 3),
  transcript text NOT NULL CHECK (length(transcript) BETWEEN 1 AND 12000),
  audio_name text NOT NULL,
  audio_mime text NOT NULL,
  audio_bytes integer NOT NULL CHECK (audio_bytes BETWEEN 1 AND 5242880),
  duration_seconds double precision NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 91),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, question_id)
);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS display_name varchar(80) NOT NULL DEFAULT 'Demo aday';
CREATE TABLE IF NOT EXISTS reviews (
  application_id uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','shortlisted','rejected')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 4000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES (1),(2) ON CONFLICT DO NOTHING;
`;
@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly pool: DbPool;
  readonly mode: 'postgres' | 'embedded';
  constructor() {
    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
      pool.on('error', () => console.error('PostgreSQL bağlantısında hata oluştu.'));
      this.pool = pool;
      this.mode = 'postgres';
    } else {
      const directory = resolve(process.env.DATA_DIR || join(__dirname, '../../.data'));
      mkdirSync(directory, { recursive: true });
      this.pool = new EmbeddedPool(join(directory, 'postgres'));
      this.mode = 'embedded';
    }
  }
  requirePool() {
    return this.pool;
  }
  async onModuleInit() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (this.mode === 'postgres') await client.query('SELECT pg_advisory_xact_lock(741337)');
      await client.query(schema);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async onModuleDestroy() { await this.pool?.end(); }
}
