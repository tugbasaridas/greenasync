import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Database } from './database';
import { questions } from './questions';

export type Answer = { questionId: number; transcript: string; audioMime: string; audioBytes: number; duration: number; updatedAt: string };
type Row = { question_id: number; transcript: string; audio_name: string; audio_mime: string; audio_bytes: number; duration_seconds: number; updated_at: Date };
const selectFields = 'question_id, transcript, audio_name, audio_mime, audio_bytes, duration_seconds, updated_at';
const format = (row: Row): Answer => ({ questionId: row.question_id, transcript: row.transcript, audioMime: row.audio_mime, audioBytes: row.audio_bytes, duration: row.duration_seconds, updatedAt: new Date(row.updated_at).toISOString() });
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
@Injectable()
export class AnswerStore {
  readonly directory = resolve(process.env.UPLOAD_DIR || join(__dirname, '../../uploads/audio'));
  constructor(@Inject(Database) private readonly db: Database) {}
  async createSession() {
    const token = randomBytes(32).toString('base64url');
    await this.db.requirePool().query('INSERT INTO applications(id, token_hash) VALUES ($1,$2)', [randomUUID(), hash(token)]);
    return { token };
  }
  async authenticate(authorization?: string) {
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) throw new UnauthorizedException('Başvuru erişim anahtarı gerekli.');
    const result = await this.db.requirePool().query('SELECT id FROM applications WHERE token_hash=$1', [hash(token)]);
    if (!result.rows[0]) throw new UnauthorizedException('Başvuru erişim anahtarı geçersiz.');
    return result.rows[0].id as string;
  }
  async list(applicationId: string) {
    const result = await this.db.requirePool().query(`SELECT ${selectFields} FROM answers WHERE application_id=$1 ORDER BY question_id`, [applicationId]);
    return result.rows.map(format);
  }
  async save(applicationId: string, questionId: number, body: Record<string, unknown>, file?: Express.Multer.File) {
    const question = questions.find(q => q.id === questionId);
    if (!question) throw new BadRequestException('Geçerli bir soru seçin.');
    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    if (!transcript || transcript.length > 12000) throw new BadRequestException('Yanıt metni 1–12000 karakter olmalı.');
    let mime: string | undefined;
    let duration: number | undefined;
    let name: string | undefined;
    if (file) {
      duration = Number(body.duration);
      if (!Number.isFinite(duration) || duration <= 0 || duration > question.maxSeconds + 1) throw new BadRequestException('Kayıt süresi geçersiz.');
      const data = file.buffer;
      // Check the actual container header, not the supplied filename.
      if (data?.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) mime = 'audio/webm';
      else if (data?.subarray(0, 4).toString() === 'OggS') mime = 'audio/ogg';
      else if (data?.subarray(4, 8).toString() === 'ftyp') mime = 'audio/mp4';
      if (!mime || !file.mimetype.startsWith(mime) || !data?.length || data.length > 5 * 1024 * 1024) throw new BadRequestException('En fazla 5 MB boyutunda WebM, Ogg veya MP4 ses dosyası gerekli.');
      name = `${randomUUID()}.${mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : 'webm'}`;
      await mkdir(this.directory, { recursive: true });
      await writeFile(join(this.directory, name), data, { flag: 'wx' });
    }
    let oldName: string | undefined;
    let result: Answer;
    let committed = false;
    const client = await this.db.requirePool().connect().catch(async error => { if (name) await unlink(join(this.directory, name)).catch(() => {}); throw error; });
    try {
      await client.query('BEGIN');
      // Serialize saves for one application: replacement cleanup cannot race.
      await client.query('SELECT id FROM applications WHERE id=$1 FOR UPDATE', [applicationId]);
      const previous = await client.query(`SELECT ${selectFields} FROM answers WHERE application_id=$1 AND question_id=$2`, [applicationId, questionId]);
      const old = previous.rows[0] as Row | undefined;
      if (!name && !old) throw new BadRequestException('İlk kayıtta ses dosyası da gerekli.');
      oldName = old?.audio_name;
      const saved = await client.query(`INSERT INTO answers(application_id,question_id,transcript,audio_name,audio_mime,audio_bytes,duration_seconds)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(application_id,question_id) DO UPDATE SET
        transcript=EXCLUDED.transcript,audio_name=EXCLUDED.audio_name,audio_mime=EXCLUDED.audio_mime,
        audio_bytes=EXCLUDED.audio_bytes,duration_seconds=EXCLUDED.duration_seconds,updated_at=clock_timestamp()
        RETURNING ${selectFields}`, [applicationId, questionId, transcript, name ?? old!.audio_name, mime ?? old!.audio_mime, file?.buffer.length ?? old!.audio_bytes, duration ?? old!.duration_seconds]);
      result = format(saved.rows[0]);
      await client.query('COMMIT');
      committed = true;
    } finally {
      if (!committed) {
        await client.query('ROLLBACK').catch(() => {});
        if (name) await unlink(join(this.directory, name)).catch(() => {});
      }
      client.release();
    }
    if (name && oldName) await unlink(join(this.directory, oldName)).catch(() => { console.warn('Eski ses dosyası temizlenemedi.'); });
    return result;
  }
  async audio(applicationId: string, questionId: number) {
    const result = await this.db.requirePool().query('SELECT audio_name, audio_mime FROM answers WHERE application_id=$1 AND question_id=$2', [applicationId, questionId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Ses kaydı bulunamadı.');
    try { return { data: await readFile(join(this.directory, row.audio_name)), mime: row.audio_mime as string }; }
    catch { throw new NotFoundException('Ses dosyası bulunamadı.'); }
  }
}
