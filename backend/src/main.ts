import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app';
config({ path: resolve(__dirname, '../../.env'), quiet: true });
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
}
bootstrap().catch(() => { console.error('API başlatılamadı. PostgreSQL bağlantısını ve .env ayarlarını kontrol edin.'); process.exit(1); });
