import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';

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
INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
`;
@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool | null;
  constructor() {
    this.pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 }) : null;
    this.pool?.on('error', () => console.error('PostgreSQL bağlantısında hata oluştu.'));
  }
  requirePool() {
    if (!this.pool) throw new ServiceUnavailableException('Kalıcı kayıt için .env dosyasında DATABASE_URL ayarlayın ve backend\'i yeniden başlatın.');
    return this.pool;
  }
  async onModuleInit() {
    if (!this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(741337)');
      await client.query(schema);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async onModuleDestroy() { await this.pool?.end(); }
}
