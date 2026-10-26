import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
@Controller()
class AppController {
  @Get('health')
  health() { return { status: 'ok', service: 'greenasync-api', version: '0.1.0' }; }
  @Get('questions')
  questions() {
    return [
      { id: 1, text: 'Kendinizi ve ilgi duyduğunuz yazılım alanlarını tanıtır mısınız?', maxSeconds: 60 },
      { id: 2, text: 'Geliştirdiğiniz bir projeyi ve projedeki katkınızı anlatır mısınız?', maxSeconds: 90 },
      { id: 3, text: 'Karşılaştığınız teknik bir sorunu nasıl çözdünüz?', maxSeconds: 90 },
    ];
  }
}
@Module({ controllers: [AppController] })
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
}
bootstrap().catch(error => { console.error(error); process.exit(1); });
