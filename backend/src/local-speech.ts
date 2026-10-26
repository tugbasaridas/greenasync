import { BadRequestException, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
@Injectable()
export class LocalSpeech implements OnModuleDestroy {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private waiting = 0;
  private active: { id: string; resolve: (value: { text: string; duration: number }) => void; reject: (error: Error) => void } | null = null;
  private idle: ReturnType<typeof setTimeout> | null = null;
  private clearIdle() { if (this.idle) clearTimeout(this.idle); this.idle = null; }
  private closeWorker() { this.clearIdle(); const child = this.child; this.child = null; this.ready = null; child?.kill(); }
  private ensureWorker(): Promise<void> {
    this.clearIdle();
    if (this.ready) return this.ready;
    const root = resolve(__dirname, '../..');
    const python = process.env.WHISPER_PYTHON || join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(python, [join(root, 'backend/speech/worker.py')], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.child = child;
    this.ready = new Promise<void>((resolveReady, rejectReady) => {
      const startupTimeout = setTimeout(() => fail(), 120000);
      const fail = () => {
        clearTimeout(startupTimeout);
        const error = new ServiceUnavailableException('Yerel konuşma modeli hazır değil. Proje klasöründe npm run setup:speech komutunu çalıştırıp backend\'i yeniden başlatın.');
        rejectReady(error);
        if (this.child === child) { this.active?.reject(error); this.active = null; this.closeWorker(); }
      };
      const lines = createInterface({ input: child.stdout });
      lines.on('line', line => {
        try {
          const result = JSON.parse(line);
          if (result.event === 'ready') { clearTimeout(startupTimeout); resolveReady(); }
          else if (result.event === 'setup_error') fail();
          else if (result.id && this.active?.id === result.id) {
            const job = this.active!; this.active = null;
            if (result.error) job.reject(new BadRequestException(String(result.error)));
            else if (typeof result.text === 'string' && result.text.trim() && Number.isFinite(result.duration) && result.duration > 0) job.resolve({ text: result.text.trim().slice(0, 12000), duration: result.duration });
            else job.reject(new BadRequestException('Kayıtta anlaşılır konuşma bulunamadı. Daha net bir sesle yeniden kaydedin.'));
          }
        } catch { /* Ignore unrelated process output; never parse it as a transcript. */ }
      });
      child.stderr.on('data', () => { /* Model details stay out of candidate responses. */ });
      child.on('error', fail);
      child.on('exit', () => { lines.close(); fail(); });
    });
    return this.ready;
  }
  async transcribe(file: Express.Multer.File) {
    if (this.waiting >= 3) throw new ServiceUnavailableException('Konuşma modeli meşgul. Biraz sonra tekrar deneyin.');
    this.waiting++;
    const previous = this.queue;
    let unlock!: () => void;
    this.queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    let directory: string | undefined;
    try {
      await this.ensureWorker();
      directory = await mkdtemp(join(tmpdir(), 'greenasync-speech-'));
      const path = join(directory, 'answer.audio');
      await writeFile(path, file.buffer);
      return await new Promise<{ text: string; duration: number }>((resolveText, reject) => {
        const id = randomUUID();
        const timeout = setTimeout(() => {
          if (this.active?.id === id) this.active = null;
          this.closeWorker();
          reject(new ServiceUnavailableException('Metne dönüştürme zaman aşımına uğradı. Kaydınız tarayıcıda korunuyor; tekrar deneyin.'));
        }, 120000);
        this.active = { id, resolve: text => { clearTimeout(timeout); resolveText(text); }, reject: error => { clearTimeout(timeout); reject(error); } };
        const child = this.child;
        if (!child?.stdin.writable) { clearTimeout(timeout); this.active = null; reject(new ServiceUnavailableException('Konuşma modeliyle bağlantı kesildi.')); return; }
        child.stdin.write(JSON.stringify({ id, path }) + '\n', error => {
          if (error && this.active?.id === id) {
            const job = this.active; this.active = null;
            job.reject(new ServiceUnavailableException('Konuşma modeliyle bağlantı kesildi.')); this.closeWorker();
          }
        });
      });
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => console.warn('Geçici konuşma dosyası temizlenemedi.'));
      this.waiting--;
      unlock();
      if (this.waiting === 0) { this.clearIdle(); this.idle = setTimeout(() => this.closeWorker(), 120000); this.idle.unref(); }
    }
  }
  onModuleDestroy() { this.active?.reject(new ServiceUnavailableException('Sunucu kapanıyor.')); this.active = null; this.closeWorker(); }
}
