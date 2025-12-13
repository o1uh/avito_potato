import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('Team Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Данные для теста
  const adminEmail = `admin_${Date.now()}@team.test`;
  const employeeEmail = `employee_${Date.now()}@team.test`;
  
  // ВАЖНО: Используем валидный ИНН (ВТБ), чтобы пройти check constraint в БД
  const validInn = '7702070139'; 
  
  let adminToken: string;
  let companyId: number;
  let employeeId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // 0. Чистка перед тестом (на случай, если предыдущий запуск упал)
    const existingCompany = await prisma.company.findUnique({ where: { inn: validInn } });
    if (existingCompany) {
      await prisma.company.delete({ where: { id: existingCompany.id } });
    }

    // 1. Создаем Компанию и Админа вручную
    const orgType = await prisma.organizationType.findFirst();
    const company = await prisma.company.create({
      data: {
        name: 'Team Test Co',
        inn: validInn, // Используем валидный ИНН
        ogrn: '1027700132195',
        organizationTypeId: orgType?.id || 1,
      },
    });
    companyId = company.id;

    const passwordHash = await argon2.hash('pass123');
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Admin User',
        passwordHash,
        companyId,
        roleInCompanyId: 1, // Админ
      },
    });

    // 2. Логинимся за Админа
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'pass123' })
      .expect(200);
    
    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Чистка
    if (companyId) {
        await prisma.company.delete({ where: { id: companyId } });
    }
    await app.close();
  });

  // --- Тесты ---

  it('/users/team/invite (POST) - Admin can invite member', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/team/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: employeeEmail,
        fullName: 'John Employee',
        roleId: 2, // Менеджер
      })
      .expect(201);

    expect(res.body.email).toBe(employeeEmail);
    expect(res.body.tempPassword).toBeDefined();
    employeeId = res.body.id;
  });

  it('/users/team (GET) - Should list all members', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/team')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // Админ + Сотрудник
    const employee = res.body.find((u) => u.email === employeeEmail);
    expect(employee).toBeDefined();
  });

  it('/users/team/:id/role (PATCH) - Change role', async () => {
    await request(app.getHttpServer())
      .patch(`/users/team/${employeeId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: 3 })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: employeeId } });
    expect(updatedUser.roleInCompanyId).toBe(3);
  });

  it('/users/team/:id (DELETE) - Remove member', async () => {
    await request(app.getHttpServer())
      .delete(`/users/team/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deletedUser = await prisma.user.findUnique({ where: { id: employeeId } });
    expect(deletedUser).toBeNull();
  });
});