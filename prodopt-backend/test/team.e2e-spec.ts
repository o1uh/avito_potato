import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('Team Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = `admin_${Date.now()}@team.test`;
  const employeeEmail = `employee_${Date.now()}@team.test`;
  
  // ИСПРАВЛЕНИЕ: Уникальный ИНН 
  const validInn = '5380162163'; 
  
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

    const existingCompany = await prisma.company.findUnique({ where: { inn: validInn } });
    if (existingCompany) {
      // Сначала удаляем юзеров, потом компанию (если каскад не настроен идеально)
      await prisma.user.deleteMany({ where: { companyId: existingCompany.id } });
      await prisma.company.delete({ where: { id: existingCompany.id } });
    }

    const orgType = await prisma.organizationType.findFirst();
    const company = await prisma.company.create({
      data: {
        name: 'Team Test Co',
        inn: validInn,
        ogrn: '1027700257023',
        organizationTypeId: orgType?.id || 1,
      },
    });
    companyId = company.id;

    const passwordHash = await argon2.hash('pass123');
    await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Admin User',
        passwordHash,
        companyId,
        roleInCompanyId: 1, 
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'pass123' })
      .expect(200);
    
    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (companyId) {
        await prisma.user.deleteMany({ where: { companyId } });
        await prisma.company.delete({ where: { id: companyId } });
    }
    await app.close();
  });

  // ... (Тесты остаются без изменений)
  it('/users/team/invite (POST) - Admin can invite member', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/team/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: employeeEmail,
        fullName: 'John Employee',
        roleId: 2,
      })
      .expect(201);
    expect(res.body.email).toBe(employeeEmail);
    employeeId = res.body.id;
  });

  it('/users/team (GET) - Should list all members', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/team')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('/users/team/:id/role (PATCH) - Change role', async () => {
    await request(app.getHttpServer())
      .patch(`/users/team/${employeeId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: 3 })
      .expect(200);
  });

  it('/users/team/:id (DELETE) - Remove member', async () => {
    await request(app.getHttpServer())
      .delete(`/users/team/${employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});