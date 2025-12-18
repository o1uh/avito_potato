import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { EmailService } from './../src/common/providers/email.service';
import { NotificationsService } from './../src/modules/communication/services/notifications.service';
import * as argon2 from 'argon2';

describe('Notifications Module (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;
  
  // Мок EmailService, чтобы не спамить в эфир
  const mockEmailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const testUser = {
    email: `notify_user_${Date.now()}@test.com`,
    password: 'password123',
    inn: '7707083893', // Сбербанк (уникальный для теста)
    token: '',
    userId: 0,
    companyId: 0,
  };

  const cleanup = async () => {
    if (!prisma) return;
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.notification.deleteMany({ where: { recipientId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.company.delete({ where: { id: user.companyId } });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(EmailService) // Переопределяем реальный сервис
    .useValue(mockEmailService)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    notificationsService = app.get(NotificationsService);

    await cleanup();

    // Регистрация пользователя
    const orgType = await prisma.organizationType.findFirst();
    const company = await prisma.company.create({
      data: { name: 'Notify Co', inn: testUser.inn, ogrn: '123', organizationTypeId: orgType?.id || 1 },
    });
    
    const hash = await argon2.hash(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        fullName: 'Notify Tester',
        passwordHash: hash,
        companyId: company.id,
        roleInCompanyId: 1,
      },
    });
    
    testUser.userId = user.id;
    testUser.companyId = company.id;

    // Логин
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    testUser.token = res.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('1. System: Should create notification in DB via Service', async () => {
    // Вызываем сервис напрямую, имитируя событие из другого модуля (например, RFQ)
    await notificationsService.send({
      userId: testUser.userId,
      subject: 'Тестовое событие',
      message: 'Это проверка связи',
      type: 'INFO',
      entityType: 'system',
      entityId: 1,
      toEmail: testUser.email, // Просим отправить и email
      template: 'notification'
    });

    // Проверяем БД
    const notification = await prisma.notification.findFirst({
      where: { recipientId: testUser.userId }
    });

    expect(notification).toBeDefined();
    expect(notification.title).toBe('Тестовое событие');
    expect(notification.isRead).toBe(false);

    // Проверяем, что EmailService был вызван
    expect(mockEmailService.sendMail).toHaveBeenCalled();
  });

  it('2. API: GET /notifications - Should list my notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toBe('Тестовое событие');
    expect(res.body.meta.unreadCount).toBeGreaterThan(0);
  });

  it('3. API: PATCH /notifications/:id/read - Should mark as read', async () => {
    // Получаем ID уведомления
    const notification = await prisma.notification.findFirst({ where: { recipientId: testUser.userId } });
    
    await request(app.getHttpServer())
      .patch(`/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200);

    // Проверяем в БД
    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(updated.isRead).toBe(true);
  });

  it('4. API: PATCH /notifications/read-all - Should mark ALL as read', async () => {
    // Создаем еще одно непрочитанное
    await notificationsService.send({
      userId: testUser.userId,
      subject: 'Второе событие',
      message: 'Тест read-all',
    });

    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200);

    const count = await prisma.notification.count({
      where: { recipientId: testUser.userId, isRead: false }
    });
    expect(count).toBe(0);
  });
});