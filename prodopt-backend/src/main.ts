import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Получаем доступ к конфигурации
  const configService = app.get(ConfigService);

  // Включаем глобальную валидацию (Требование ТЗ)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет из запроса поля, которых нет в DTO
      transform: true, // Автоматически преобразует типы (например, строку '1' в число 1)
    }),
  );

  // Включаем Graceful Shutdown (корректное завершение при SIGTERM)
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();