import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // ИНН для Auth тестов (Газпром)
  const validInn = '7736050003';

  const timestamp = Date.now();
  const testUser = {
    email: `auth_e2e_${timestamp}@test.com`,
    password: 'SuperStrongPassword123',
    fullName: 'E2E Auth User',
    companyName: `E2E Auth Company ${timestamp}`,
    inn: validInn,
    phone: '+79990000000',
  };

  let accessToken: string;

  // Функция полной очистки данных для этого теста
  const cleanup = async () => {
    // 1. Удаляем пользователя по email
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      // Удаляем связанные сущности юзера (если есть)
      await prisma.user.delete({ where: { id: user.id } });
    }

    // 2. Удаляем компанию по ИНН
    const company = await prisma.company.findUnique({ where: { inn: validInn } });
    if (company) {
      // Удаляем сделки, где компания участвует
      await prisma.deal.deleteMany({
        where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] }
      });
      // Удаляем запросы
      await prisma.purchaseRequest.deleteMany({ where: { buyerCompanyId: company.id } });
      // Удаляем офферы
      await prisma.commercialOffer.deleteMany({ where: { supplierCompanyId: company.id } });
      // Удаляем сотрудников (если остались после удаления юзера выше)
      await prisma.user.deleteMany({ where: { companyId: company.id } });
      
      // Наконец удаляем компанию
      await prisma.company.delete({ where: { id: company.id } });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await cleanup(); // Чистим перед стартом
  });

  afterAll(async () => {
    await cleanup(); // Чистим после завершения
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