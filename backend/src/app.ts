import { Body, CanActivate, Controller, ExecutionContext, Get, Headers, Inject, Injectable, Module, Param, ParseIntPipe, Post, Put, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { Database } from './database';
import { AnswerStore } from './answer-store';
import { questions } from './questions';
import { HrController, HrGuard, HrService } from './hr';
import { LocalSpeech } from './local-speech';
import { BadRequestException } from '@nestjs/common';
type SessionRequest = Request & { applicationId: string };
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AnswerStore) private readonly store: AnswerStore) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    request.applicationId = await this.store.authenticate(request.headers.authorization);
    return true;
  }
}
@Controller()
export class AppController {
  constructor(@Inject(AnswerStore) private readonly store: AnswerStore, @Inject(Database) private readonly db: Database, @Inject(LocalSpeech) private readonly speech: LocalSpeech) {}
  @Get('health')
  health() { return { status: 'ok', service: 'greenasync-api', version: '0.5.0', storageConfigured: Boolean(this.db.pool), storageMode: this.db.mode }; }
  @Get('questions')
  questions() { return questions; }
  @Post('applications')
  create(@Res({ passthrough: true }) res: Response, @Body() body?: { displayName?: string }) { res.setHeader('Cache-Control', 'no-store'); return this.store.createSession(body?.displayName); }
  @Get('answers')
  @UseGuards(SessionGuard)
  list(@Req() request: SessionRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.store.list(request.applicationId);
  }
  @Put('answers/:questionId')
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 60000, parts: 3 } }))
  save(@Req() request: SessionRequest, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: Record<string, unknown>, @UploadedFile() file?: Express.Multer.File) {
    return this.store.save(request.applicationId, questionId, body, file);
  }
  @Post('answers/:questionId/transcribe')
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 100, parts: 2 } }))
  async transcribe(@Req() request: SessionRequest, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: { duration?: string }, @UploadedFile() file?: Express.Multer.File) {
    const question = questions.find(item => item.id === questionId);
    const duration = Number(body.duration);
    if (!question || !file?.buffer?.length || !Number.isFinite(duration) || duration <= 0 || duration > question.maxSeconds + 1) throw new BadRequestException('Ses dosyası veya süre geçersiz.');
    if (!/^audio\/(webm|ogg|mp4)(;|$)/.test(file.mimetype)) throw new BadRequestException('Desteklenen bir ses dosyası gerekli.');
    const result = await this.speech.transcribe(file);
    if (result.duration > question.maxSeconds + 1) throw new BadRequestException('Ses dosyası soru süresini aşıyor.');
    return this.store.save(request.applicationId, questionId, { transcript: result.text, duration: result.duration }, file);
  }
  @Get('answers/:questionId/audio')
  @UseGuards(SessionGuard)
  async audio(@Req() request: SessionRequest, @Param('questionId', ParseIntPipe) questionId: number, @Res({ passthrough: true }) res: Response) {
    const file = await this.store.audio(request.applicationId, questionId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.data, { type: file.mime, disposition: 'attachment; filename="answer.audio"', length: file.data.length });
  }
}
@Module({ controllers: [AppController, HrController], providers: [Database, AnswerStore, SessionGuard, HrService, HrGuard, LocalSpeech] })
export class AppModule {}
