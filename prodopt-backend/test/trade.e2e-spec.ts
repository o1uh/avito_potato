import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { DealStatus } from '../src/modules/trade/utils/deal-state-machine';

describe('Trade Module (e2e) - Full Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // ИНН отличные от Auth (Газпром) и Team (ВТБ) тестов
  const buyerUser = {
    email: `trade_buyer_${Date.now()}@test.com`,
    password: 'pass',
    inn: '733054782647', // Сбербанк (Покупатель)
    token: '',
    companyId: 0,
  };

  const supplierUser = {
    email: `trade_supplier_${Date.now()}@test.com`,
    password: 'pass',
    inn: '804055606431', // Аэрофлот (Поставщик)
    token: '',
    companyId: 0,
  };

  const hackerUser = {
    email: `trade_hacker_${Date.now()}@test.com`,
    password: 'pass',
    inn: '209481831712', // Лукойл (Хакер)
    token: '',
    companyId: 0
  }

  // Функция "умной" очистки конкретного юзера и компании
  const cleanSpecificUser = async (email: string, inn: string) => {
    // 1. Находим и удаляем юзера (это освободит email)
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        // Удаляем документы загруженные юзером
        await prisma.document.deleteMany({ where: { uploadedById: user.id } });
        // Удаляем самого юзера
        await prisma.user.delete({ where: { id: user.id } });
    }

    // 2. Находим и удаляем компанию (это освободит ИНН)
    const company = await prisma.company.findUnique({ where: { inn } });
    if (company) {
        // Удаляем зависимости, чтобы не было FK ошибок
        await prisma.transaction.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        await prisma.escrowAccount.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        await prisma.dealItem.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        
        await prisma.deal.deleteMany({ where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } });
        
        await prisma.commercialOffer.deleteMany({ where: { OR: [{ supplierCompanyId: company.id }, { purchaseRequest: { buyerCompanyId: company.id } }] } });
        await prisma.purchaseRequest.deleteMany({ where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } });
        
        // Удаляем продукты
        await prisma.productVariant.deleteMany({ where: { product: { supplierCompanyId: company.id } } });
        await prisma.productImage.deleteMany({ where: { product: { supplierCompanyId: company.id } } });
        await prisma.product.deleteMany({ where: { supplierCompanyId: company.id } });

        // Удаляем оставшихся сотрудников
        await prisma.user.deleteMany({ where: { companyId: company.id } });

        // Удаляем компанию
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

    // Чистим всех участников перед стартом
    await cleanSpecificUser(buyerUser.email, buyerUser.inn);
    await cleanSpecificUser(supplierUser.email, supplierUser.inn);
    await cleanSpecificUser(hackerUser.email, hackerUser.inn);

    // Создаем пользователей
    await setupUser(buyerUser, 'Buyer Co');
    await setupUser(supplierUser, 'Supplier Co');
  });

  afterAll(async () => {
    // Чистка после тестов
    await cleanSpecificUser(buyerUser.email, buyerUser.inn);
    await cleanSpecificUser(supplierUser.email, supplierUser.inn);
    await cleanSpecificUser(hackerUser.email, hackerUser.inn);
    
    await app.close();
  });

  async function setupUser(u: any, name: string) {
    const orgType = await prisma.organizationType.findFirst();
    const orgTypeId = orgType ? orgType.id : 1;

    // Создаем компанию
    const company = await prisma.company.create({
      data: { name, inn: u.inn, ogrn: '123', organizationTypeId: orgTypeId },
    });
    u.companyId = company.id;

    // Создаем юзера
    const hash = await argon2.hash(u.password);
    await prisma.user.create({
      data: {
        email: u.email,
        fullName: name,
        passwordHash: hash,
        companyId: company.id,
        roleInCompanyId: 1,
      },
    });

    // Логинимся для получения токена
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: u.email, password: u.password });
    
    u.token = res.body.data.accessToken;
  }

  // --- ПЕРЕМЕННЫЕ ПОТОКА ---
  let rfqId: number;
  let offerId: number;
  let dealId: number;
  let initialSupplierBalance = 0;

  // --- ТЕСТЫ ---

  it('1. Buyer: Create RFQ', async () => {
    const res = await request(app.getHttpServer())
      .post('/trade/rfq')
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({
        comment: 'Need 100kg of potatoes',
      })
      .expect(201);
    
    rfqId = res.body.id;
    expect(rfqId).toBeDefined();
  });

  it('2. Supplier: Create Offer', async () => {
    const res = await request(app.getHttpServer())
      .post('/trade/offers')
      .set('Authorization', `Bearer ${supplierUser.token}`)
      .send({
        requestId: rfqId,
        offerPrice: 5000,
        deliveryConditions: 'EXW Moscow',
        expiresOn: '2025-12-31',
      })
      .expect(201);

    offerId = res.body.id;
    expect(offerId).toBeDefined();
  });

  it('3. Buyer: Create Deal from Offer', async () => {
    const res = await request(app.getHttpServer())
      .post('/trade/deals/from-offer')
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({ offerId })
      .expect(201);

    dealId = res.body.id;
    expect(dealId).toBeDefined();
    expect(res.body.dealStatusId).toBe(DealStatus.CREATED);
  });

  it('4. Buyer: Accept Deal (-> AGREED)', async () => {
    await request(app.getHttpServer())
      .post(`/trade/deals/${dealId}/accept`)
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .expect(201);

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal.dealStatusId).toBe(DealStatus.AGREED);
    
    const escrow = await prisma.escrowAccount.findUnique({ where: { dealId } });
    expect(escrow).toBeDefined();
    expect(Number(escrow.totalAmount)).toBe(5000);
  });

  it('5. Mock Finance: Deposit Funds (-> PAID)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/dev/trade/deals/${dealId}/deposit`)
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({ amount: 5000 })
      .expect(201);

    expect(res.body.status).toBe('PAID');

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal.dealStatusId).toBe(DealStatus.PAID);
  });

  it('6. Security (IDOR): Random user cannot access deal', async () => {
    // 1. Регистрируем хакера
    await setupUser(hackerUser, 'Hacker Co');

    // 2. Пытаемся получить доступ к чужой сделке
    await request(app.getHttpServer())
      .get(`/trade/deals/${dealId}`)
      .set('Authorization', `Bearer ${hackerUser.token}`)
      .expect(403); // Forbidden
  });

  it('7. Supplier: Add Tracking Number (Deal -> SHIPPED)', async () => {
    // 1. Проверяем, что сделка оплачена (мы это сделали в тесте 5)
    // 2. Отправляем трек-номер
    await request(app.getHttpServer())
      .post(`/trade/deals/${dealId}/shipment`)
      .set('Authorization', `Bearer ${supplierUser.token}`)
      .send({
        trackingNumber: 'TEST-DELIVERED-123', // Специальный префикс для мока (если бы был интеграционный тест с адаптером)
        carrier: 'CDEK'
      })
      .expect(201);

    // 3. Проверяем статус сделки
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal.dealStatusId).toBe(4); // 4 = SHIPPED
    
    // 4. Проверяем создание отгрузки
    const shipment = await prisma.shipment.findUnique({ where: { trackingNumber: 'TEST-DELIVERED-123' }});
    expect(shipment).toBeDefined();
    expect(shipment.dealId).toBe(dealId);
  });

  it('8. Buyer: Fail to Confirm Delivery (If not owner/wrong status)', async () => {
    // Хакер пытается подтвердить
    await request(app.getHttpServer())
      .post(`/trade/deals/${dealId}/confirm`)
      .set('Authorization', `Bearer ${hackerUser.token}`)
      .expect(403);
  });

  it('9. Buyer: Confirm Delivery (Deal -> COMPLETED + Money Release)', async () => {
    // Покупатель подтверждает приемку
    await request(app.getHttpServer())
      .post(`/trade/deals/${dealId}/confirm`)
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .expect(201);

    // 1. Проверяем статус сделки
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal.dealStatusId).toBe(5); // 5 = COMPLETED

    // 2. Проверяем статус Эскроу счета
    const escrow = await prisma.escrowAccount.findUnique({ where: { dealId } });
    expect(escrow.escrowStatusId).toBe(3); // 3 = RELEASED (Деньги ушли продавцу)
    
    // 3. Проверяем баланс (депозит должен уменьшиться на сумму выплаты)
    // В нашей логике release: amountDeposited = amountDeposited - payout.
    // Если payout = total - fee, то останется fee (комиссия платформы).
    // Total: 5000. Fee (2%): 100. Payout: 4900.
    // Остаток: 5000 - 4900 = 100.
    expect(Number(escrow.amountDeposited)).toBe(100); 

    // 4. Проверяем транзакции
    const transactions = await prisma.transaction.findMany({ where: { dealId } });
    const releaseTx = transactions.find(t => t.transactionTypeId === 2); // 2 = RELEASE
    expect(releaseTx).toBeDefined();
    expect(Number(releaseTx.amount)).toBe(4900); // 5000 - 2%
  });

  it('10. Documents: Verify Act generation', async () => {
    // Проверяем, что акт был создан автоматически
    const act = await prisma.document.findFirst({
      where: {
        entityId: dealId,
        entityType: 'deal',
        // Мы мапили 'act' на 'Акт' в DocumentsService, но для теста ищем любой созданный после закрытия
        documentType: { name: 'Акт' }
      }
    });
    
    expect(act).toBeDefined();
    expect(act.uploadedById).toBe(1); // System user (мы передавали 1 в DealsService)
  });
});