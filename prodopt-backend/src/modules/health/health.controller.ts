import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator, // Используем или PrismaHealthIndicator (кастомный)
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
          throw { database: { status: 'down', message: e.message } };
        }
      },
      // Проверка внешнего API (пример)
      () => this.http.pingCheck('google', 'https://google.com'),
    ]);
  }
}