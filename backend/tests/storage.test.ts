import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppController, SessionGuard } from '../src/app';
import { AnswerStore } from '../src/answer-store';
import { Database, schema } from '../src/database';
import { HrController, HrGuard, HrService } from '../src/hr';
import { LocalSpeech } from '../src/local-speech';
let app: INestApplication;
let base: string;
let dir: string;
let tempRoot: string;
let database: { pool: unknown; requirePool: () => unknown };
let pg: PGlite | undefined;
let real: Pool | undefined;
let token: string;
let stranger: string;
const bytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
const auth = (key = token) => ({ Authorization: `Bearer ${key}` });
async function send(question: number, text: string, audio = true, buffer = bytes, key = token, duration = '2') {
  const body = new FormData(); body.set('transcript', text);
  if (audio) { body.set('duration', duration); body.set('audio', new Blob([buffer], { type: 'audio/webm' }), 'answer.webm'); }
  return fetch(`${base}/answers/${question}`, { method: 'PUT', body, headers: auth(key) });
}
before(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'greenasync-test-'));
  dir = join(tempRoot, 'audio');
  await mkdir(dir);
  process.env.UPLOAD_DIR = dir;
  process.env.HR_PASSWORD = 'test-only-password';
  // CI uses a dedicated real PostgreSQL database; local tests use the
  // PostgreSQL WASM engine rather than an in-memory SQL imitation.
  let pool: unknown;
  if (process.env.TEST_DATABASE_URL) {
    real = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await real.query(schema);
    pool = real;
  } else {
    pg = new PGlite(join(tempRoot, 'database'));
    await pg.exec(schema);
    const query = async (sql: string, params?: unknown[]) => pg!.query(sql, params);
    pool = { query, connect: async () => ({ query, release() {} }) };
  }
  database = { pool, requirePool: () => pool };
  await boot();
  const first = await fetch(`${base}/applications`, { method: 'POST' });
  assert.equal(first.status, 201); token = (await first.json()).token;
  stranger = (await (await fetch(`${base}/applications`, { method: 'POST' })).json()).token;
});
async function boot() {
  app = await NestFactory.create({ module: class Fixture {}, controllers: [AppController, HrController], providers: [AnswerStore, SessionGuard, HrGuard, HrService, { provide: LocalSpeech, useValue: { transcribe: async () => ({ text: 'Yerel modelden metin', duration: 2 }) } }, { provide: Database, useValue: database }] }, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api`;
}
after(async () => { await app?.close(); await real?.end(); await pg?.close(); if (tempRoot) await rm(tempRoot, { recursive: true, force: true }); });
test('unauthenticated upload is rejected before saving a file', async () => {
  const r = await send(1, 'deneme', true, bytes, 'invalid');
  assert.equal(r.status, 401);
  assert.equal((await readdir(dir)).length, 0);
});
test('audio and Turkish text persist; list contains no audio payload or private paths', async () => {
  const response = await send(1, 'Türkçe yanıt: bir proje geliştirdim.');
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.audioBytes, bytes.length);
  const listed = await fetch(`${base}/answers`, { headers: auth() });
  assert.match(listed.headers.get('cache-control')!, /no-store/);
  const list = await listed.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].transcript, 'Türkçe yanıt: bir proje geliştirdim.');
  assert.equal('audio_name' in list[0], false);
  assert.equal('data' in list[0], false);
  const audio = await fetch(`${base}/answers/1/audio`, { headers: auth() });
  assert.equal(audio.status, 200);
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), bytes);
  assert.equal(audio.headers.get('content-type'), 'audio/webm');
});
test('another application cannot read the first application text or audio', async () => {
  const listed = await fetch(`${base}/answers`, { headers: auth(stranger) });
  assert.deepEqual(await listed.json(), []);
  assert.equal((await fetch(`${base}/answers/1/audio`, { headers: auth(stranger) })).status, 404);
});
test('text-only update retains the existing audio without an extra file', async () => {
  assert.equal((await send(1, 'Düzeltilmiş metin', false)).status, 200);
  assert.equal((await readdir(dir)).length, 1);
  const list = await (await fetch(`${base}/answers`, { headers: auth() })).json();
  assert.equal(list[0].transcript, 'Düzeltilmiş metin');
  assert.equal(list[0].audioBytes, bytes.length);
});
test('replacing audio deletes the previous file and preserves one answer per question', async () => {
  const oldName = (await readdir(dir))[0];
  const replacement = Buffer.concat([bytes, Buffer.from('new')]);
  assert.equal((await send(1, 'Yeni yanıt', true, replacement)).status, 200);
  const files = await readdir(dir);
  assert.equal(files.length, 1); assert.notEqual(files[0], oldName);
  const list = await (await fetch(`${base}/answers`, { headers: auth() })).json();
  assert.equal(list.length, 1); assert.equal(list[0].audioBytes, replacement.length);
});
test('empty text, unknown question, bogus audio, missing first audio, excessive duration rejected', async () => {
  for (const response of [await send(2, ''), await send(99, 'x'), await send(2, 'x', true, Buffer.from('not audio')), await send(2, 'x', false), await send(2, 'x', true, bytes, token, '999')]) assert.equal(response.status, 400);
  assert.equal((await readdir(dir)).length, 1);
});
test('upload size is bounded at 5 MB and invalid token fails on list', async () => {
  const huge = Buffer.alloc(5 * 1024 * 1024 + 1); bytes.copy(huge);
  assert.equal((await send(2, 'x', true, huge)).status, 413);
  assert.equal((await fetch(`${base}/answers`, { headers: auth('A'.repeat(43)) })).status, 401);
  assert.equal((await readdir(dir)).length, 1);
});

test('saved text and audio survive an API restart and local database restart', async () => {
  await app.close();
  if (pg) {
    await pg.close();
    pg = new PGlite(join(tempRoot, 'database'));
  }
  await boot();
  const answers = await (await fetch(`${base}/answers`, { headers: auth() })).json();
  assert.equal(answers.length, 1);
  assert.equal(answers[0].transcript, 'Yeni yanıt');
  const response = await fetch(`${base}/answers/1/audio`, { headers: auth() });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.concat([bytes, Buffer.from('new')]));
});

test('failed database write rolls back and removes the new audio file', async () => {
  const store = app.get(AnswerStore);
  const before = await readdir(dir);
  await assert.rejects(() => store.save('00000000-0000-0000-0000-000000000001', 2, { transcript: 'test', duration: '2' }, { buffer: bytes, mimetype: 'audio/webm' } as Express.Multer.File));
  assert.deepEqual(await readdir(dir), before);
  const list = await (await fetch(`${base}/answers`, { headers: auth() })).json();
  assert.equal(list[0].transcript, 'Yeni yanıt');
});

test('local transcription endpoint returns and persists text without requiring a browser transcript', async () => {
  const body = new FormData(); body.set('duration', '2'); body.set('audio', new Blob([bytes], { type: 'audio/webm' }), 'answer.webm');
  const response = await fetch(`${base}/answers/2/transcribe`, { method: 'POST', headers: auth(), body });
  assert.equal(response.status, 201);
  const answer = await response.json();
  assert.equal(answer.transcript, 'Yerel modelden metin');
  assert.equal(answer.questionId, 2);
});
test('HR requires login, reads transcripts, reviews and requests audio only on demand', async () => {
  assert.equal((await fetch(`${base}/hr/applications`)).status, 401);
  const login = await fetch(`${base}/hr/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'ik', password: 'test-only-password' }) });
  assert.equal(login.status, 201);
  const cookie = login.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Strict/i);
  const headers = { Cookie: cookie.split(';')[0] };
  const result = await (await fetch(`${base}/hr/applications`, { headers })).json();
  const candidate = result.items.find((item: any) => item.answerCount === 2);
  assert.ok(candidate);
  const detail = await (await fetch(`${base}/hr/applications/${candidate.id}`, { headers })).json();
  assert.equal(detail.answers.length, 2);
  assert.equal(detail.answers[1].transcript, 'Yerel modelden metin');
  assert.equal('data' in detail.answers[0], false);
  const saved = await fetch(`${base}/hr/applications/${candidate.id}/review`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'reviewing', note: 'Metin incelendi; ses açılmadı.' }) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).note, 'Metin incelendi; ses açılmadı.');
  const audio = await fetch(`${base}/hr/applications/${candidate.id}/answers/2/audio`, { headers });
  assert.equal(audio.status, 200);
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), bytes);
  await fetch(`${base}/hr/logout`, { method: 'POST', headers });
  assert.equal((await fetch(`${base}/hr/applications`, { headers })).status, 401);
});
