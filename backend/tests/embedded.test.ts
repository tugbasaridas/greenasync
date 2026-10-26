import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EmbeddedPool } from '../src/embedded-pool';
import { schema } from '../src/database';
test('embedded PostgreSQL persists data and serializes queries around transactions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'greenasync-embedded-'));
  let pool = new EmbeddedPool(join(root, 'database'));
  try {
    await pool.query(schema);
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query("INSERT INTO applications(id,token_hash,display_name) VALUES($1,$2,$3)", ['00000000-0000-0000-0000-000000000002', 'a'.repeat(64), 'Test aday']);
    let completed = false;
    const queued = pool.query('SELECT display_name FROM applications').then(result => { completed = true; return result; });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(completed, false);
    await client.query('COMMIT'); client.release();
    assert.equal((await queued).rows[0].display_name, 'Test aday');
    await pool.end();
    pool = new EmbeddedPool(join(root, 'database'));
    assert.equal((await pool.query('SELECT display_name FROM applications')).rows[0].display_name, 'Test aday');
  } finally { await pool.end(); await rm(root, { recursive: true, force: true }); }
});
