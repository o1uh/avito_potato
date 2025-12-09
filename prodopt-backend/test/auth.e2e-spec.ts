import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Генерируем уникальные данные для каждого запуска, чтобы не чистить БД
  const timestamp = Date.now();
  const testUser = {
    email: `e2e_user_${timestamp}@test.com`,
    password: 'SuperStrongPassword123',
    fullName: 'E2E User',
    companyName: `E2E Company ${timestamp}`,
    inn: String(timestamp).slice(-10), // 10 цифр из timestamp
    phone: '+79990000000',
  };

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Важно подключить валидацию, так как она используется в main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Удаляем тестовые данные после прогона
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.company.delete({ where: { id: user.companyId } });
    }
    await app.close();
  });

  // 1. Регистрация
  it('/auth/register (POST) - Success', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .expect((res) => {
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
      });
  });

  // 2. Вход с неверным паролем
  it('/auth/login (POST) - Fail Password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' })
      .expect(401);
  });

  // 3. Вход верный
  it('/auth/login (POST) - Success', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200)
      .expect((res) => {
        accessToken = res.body.data.accessToken;
        expect(accessToken).toBeDefined();
      });
  });

  // 4. Получение профиля с токеном
  it('/users/profile (GET) - Success', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        const user = res.body.data;
        expect(user.email).toBe(testUser.email);
        expect(user.fullName).toBe(testUser.fullName);
        // Проверка безопасности: пароль не должен возвращаться
        expect(user.passwordHash).toBeUndefined();
        expect(user.refreshTokenHash).toBeUndefined();
      });
  });

  // 5. Получение профиля без токена
  it('/users/profile (GET) - Unauthorized', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .expect(401);
  });
});