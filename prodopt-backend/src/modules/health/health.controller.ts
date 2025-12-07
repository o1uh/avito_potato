import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckError, // <--- Добавили импорт класса ошибки
} from '@nestjs/terminus';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  private prisma = new PrismaClient();

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Проверка БД (простой запрос)
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (e) {
          // ВАЖНО: Используем HealthCheckError, чтобы Terminus вернул 503, а не 500
          throw new HealthCheckError('Database check failed', {
            database: { status: 'down', message: e.message },
          });
        }
      },
      // Проверка внешнего API (пример)
      // В тесте E2E/Manual это может падать, если нет инета, но пока оставим как есть или закомментируем, если мешает
      () => this.http.pingCheck('google', 'https://google.com'),
    ]);
  }
}