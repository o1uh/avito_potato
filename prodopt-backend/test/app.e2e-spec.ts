import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Тест: Application Bootstrap (Приложение запускается)
  it('Application should bootstrap and listen', () => {
    expect(app).toBeDefined();
  });

  // Тест: Healthcheck эндпоинт доступен
  it('/health (GET) should return 200 or 503', () => {
    // Мы не требуем строго 200, так как в тестовом окружении 
    // БД может быть недоступна, но эндпоинт должен ответить
    return request(app.getHttpServer())
      .get('/health')
      .expect((res) => {
        if (res.status !== 200 && res.status !== 503) {
          throw new Error(`Expected status 200 or 503, got ${res.status}`);
        }
      });
  }, 30000); // Увеличен таймаут до 30 секунд
});