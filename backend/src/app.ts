import { Body, CanActivate, Controller, ExecutionContext, Get, Headers, Inject, Injectable, Module, Param, ParseIntPipe, Post, Put, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { Database } from './database';
import { AnswerStore } from './answer-store';
import { questions } from './questions';
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
  constructor(@Inject(AnswerStore) private readonly store: AnswerStore, @Inject(Database) private readonly db: Database) {}
  @Get('health')
  health() { return { status: 'ok', service: 'greenasync-api', version: '0.4.0', storageConfigured: Boolean(this.db.pool) }; }
  @Get('questions')
  questions() { return questions; }
  @Post('applications')
  create(@Res({ passthrough: true }) res: Response) { res.setHeader('Cache-Control', 'no-store'); return this.store.createSession(); }
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
  @Get('answers/:questionId/audio')
  @UseGuards(SessionGuard)
  async audio(@Req() request: SessionRequest, @Param('questionId', ParseIntPipe) questionId: number, @Res({ passthrough: true }) res: Response) {
    const file = await this.store.audio(request.applicationId, questionId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.data, { type: file.mime, disposition: 'attachment; filename="answer.audio"', length: file.data.length });
  }
}
@Module({ controllers: [AppController], providers: [Database, AnswerStore, SessionGuard] })
export class AppModule {}
