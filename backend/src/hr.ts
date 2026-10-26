import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, Inject, Injectable, NotFoundException, OnModuleInit, Param, ParseUUIDPipe, Post, Put, Query, Req, Res, StreamableFile, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { join, resolve } from 'node:path';
import { Database } from './database';
import { AnswerStore } from './answer-store';
@Injectable()
export class HrService implements OnModuleInit {
  private passwordHash = Buffer.alloc(64);
  private readonly salt = randomBytes(16);
  private readonly sessions = new Map<string, number>();
  private readonly failures = new Map<string, { count: number; until: number }>();
  readonly username = process.env.HR_USERNAME || 'ik';
  constructor(@Inject(Database) private readonly db: Database) {}
  async onModuleInit() {
    let password = process.env.HR_PASSWORD;
    if (!password) {
      const directory = resolve(process.env.DATA_DIR || join(__dirname, '../../.data'));
      const path = join(directory, 'hr-password.txt');
      await mkdir(directory, { recursive: true });
      try { password = (await readFile(path, 'utf8')).trim(); }
      catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
        password = randomBytes(18).toString('base64url');
        await writeFile(path, password, { flag: 'wx', mode: 0o600 });
      }
      console.log(`İK kullanıcı adı: ${this.username}. Şifre dosyası: ${path}`);
    }
    if (password.length < 8) throw new Error('HR_PASSWORD en az 8 karakter olmalı.');
    this.passwordHash = scryptSync(password, this.salt, 64);
  }
  login(username: unknown, password: unknown, ip: string) {
    const previous = this.failures.get(ip);
    if (previous && previous.until > Date.now() && previous.count >= 5) throw new UnauthorizedException('Çok fazla deneme. 10 dakika sonra tekrar deneyin.');
    const valid = typeof password === 'string' && password.length <= 200 && username === this.username && timingSafeEqual(scryptSync(password, this.salt, 64), this.passwordHash);
    if (!valid) {
      this.failures.set(ip, { count: previous && previous.until > Date.now() ? previous.count + 1 : 1, until: Date.now() + 600000 });
      throw new UnauthorizedException('İK kullanıcı adı veya şifre hatalı.');
    }
    this.failures.delete(ip);
    for (const [token, expiry] of this.sessions) if (expiry < Date.now()) this.sessions.delete(token);
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, Date.now() + 8 * 3600000);
    return token;
  }
  authenticate(cookie?: string) {
    const token = cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('greenasync_hr='))?.slice('greenasync_hr='.length);
    if (!token || (this.sessions.get(token) ?? 0) < Date.now()) throw new UnauthorizedException('İK girişi gerekli.');
    return token;
  }
  logout(cookie?: string) { try { this.sessions.delete(this.authenticate(cookie)); } catch {} }
  async applications(page = 0) {
    if (!Number.isInteger(page) || page < 0 || page > 10000) throw new BadRequestException('Geçersiz sayfa.');
    const result = await this.db.requirePool().query(`SELECT a.id,a.display_name AS "displayName",a.created_at AS "createdAt",count(n.question_id)::int AS "answerCount",coalesce(r.status,'new') AS status
      FROM applications a LEFT JOIN answers n ON n.application_id=a.id LEFT JOIN reviews r ON r.application_id=a.id
      GROUP BY a.id,a.display_name,a.created_at,r.status ORDER BY a.created_at DESC,a.id DESC LIMIT 21 OFFSET $1`, [page * 20]);
    return { items: result.rows.slice(0, 20), hasNext: result.rows.length > 20, page };
  }
  async details(id: string) {
    const result = await this.db.requirePool().query(`SELECT a.id,a.display_name AS "displayName",a.created_at AS "createdAt",coalesce(r.status,'new') AS status,coalesce(r.note,'') AS note
      FROM applications a LEFT JOIN reviews r ON r.application_id=a.id WHERE a.id=$1`, [id]);
    if (!result.rows[0]) throw new NotFoundException('Başvuru bulunamadı.');
    return result.rows[0];
  }
  async review(id: string, status: unknown, note: unknown) {
    if (!['new','reviewing','shortlisted','rejected'].includes(String(status)) || typeof note !== 'string' || note.length > 4000) throw new BadRequestException('Durum veya not geçersiz.');
    await this.details(id);
    await this.db.requirePool().query(`INSERT INTO reviews(application_id,status,note) VALUES($1,$2,$3) ON CONFLICT(application_id) DO UPDATE SET status=EXCLUDED.status,note=EXCLUDED.note,updated_at=clock_timestamp()`, [id, status, note]);
    return this.details(id);
  }
}
@Injectable()
export class HrGuard implements CanActivate {
  constructor(@Inject(HrService) private readonly hr: HrService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    this.hr.authenticate(request.headers.cookie);
    return true;
  }
}
@Controller('hr')
export class HrController {
  constructor(@Inject(HrService) private readonly hr: HrService, @Inject(AnswerStore) private readonly answers: AnswerStore) {}
  @Post('login')
  login(@Body() body: { username?: unknown; password?: unknown }, @Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.hr.login(body?.username, body?.password, request.ip || 'local');
    res.cookie('greenasync_hr', token, { httpOnly: true, sameSite: 'strict', secure: request.secure, path: '/api/hr', maxAge: 8 * 3600000 });
    res.setHeader('Cache-Control', 'no-store');
    return { username: this.hr.username };
  }
  @Post('logout')
  logout(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    this.hr.logout(request.headers.cookie); res.clearCookie('greenasync_hr', { path: '/api/hr' }); return { ok: true };
  }
  @Get('me') @UseGuards(HrGuard)
  me() { return { username: this.hr.username }; }
  @Get('applications') @UseGuards(HrGuard)
  applications(@Query('page') page?: string) { return this.hr.applications(page ? Number(page) : 0); }
  @Get('applications/:id') @UseGuards(HrGuard)
  async details(@Param('id', ParseUUIDPipe) id: string) { return { application: await this.hr.details(id), answers: await this.answers.list(id) }; }
  @Put('applications/:id/review') @UseGuards(HrGuard)
  review(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status?: unknown; note?: unknown }) { return this.hr.review(id, body?.status, body?.note); }
  @Get('applications/:id/answers/:questionId/audio') @UseGuards(HrGuard)
  async audio(@Param('id', ParseUUIDPipe) id: string, @Param('questionId') questionId: string) {
    if (!/^[1-3]$/.test(questionId)) throw new BadRequestException('Geçersiz soru.');
    const file = await this.answers.audio(id, Number(questionId));
    return new StreamableFile(file.data, { type: file.mime, disposition: 'attachment; filename="answer.audio"', length: file.data.length });
  }
}
