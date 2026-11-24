import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Общая настройка, чтобы тесты поднимали приложение ровно так же, как main.ts */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  return app;
}
