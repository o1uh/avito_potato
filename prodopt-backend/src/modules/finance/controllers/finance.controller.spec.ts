import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest'; 
import { FinanceController } from './finance.controller';
import { EscrowService } from '../services/escrow.service';
import { TransactionsService } from '../services/transactions.service';
import { TochkaBankAdapter } from '../adapters/tochka-bank.adapter';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BankWebhookGuard } from '../guards/bank-webhook.guard';
// 1. Импортируем сервис уведомлений
import { NotificationsService } from '../../communication/services/notifications.service';

describe('FinanceController (Integration)', () => {
  let app: INestApplication;
  let escrowService: EscrowService;
  let transactionsService: TransactionsService;
  let bankAdapter: TochkaBankAdapter;

  // Моки сервисов
  const mockEscrowService = {
    deposit: jest.fn(),
    getBalance: jest.fn(),
  };

  const mockTransactionsService = {
    existsByExternalId: jest.fn(),
    linkExternalPaymentId: jest.fn(),
  };

  const mockBankAdapter = {
    validateWebhookSignature: jest.fn(),
    createPaymentLink: jest.fn(),
  };

  const mockPrismaService = {
    deal: {
      update: jest.fn(),
      // 2. ВАЖНО: Возвращаем объект сделки по умолчанию, чтобы не падать с 500
      findUnique: jest.fn().mockResolvedValue({ 
        id: 10, 
        supplierCompanyId: 5, 
        buyerCompanyId: 6,
        dealStatusId: 2 
      }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]), // Заглушка для поиска пользователей
    },
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'BANK_WEBHOOK_SECRET') return 'test-secret';
      return null;
    }),
  };

  // 3. Создаем мок для NotificationsService
  const mockNotificationsService = {
    send: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: EscrowService, useValue: mockEscrowService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: TochkaBankAdapter, useValue: mockBankAdapter },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        // 4. Добавляем провайдер уведомлений
        { provide: NotificationsService, useValue: mockNotificationsService },
        BankWebhookGuard, 
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    escrowService = moduleFixture.get<EscrowService>(EscrowService);
    transactionsService = moduleFixture.get<TransactionsService>(TransactionsService);
    bankAdapter = moduleFixture.get<TochkaBankAdapter>(TochkaBankAdapter);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /finance/webhook/tochka', () => {
    const webhookPayload = {
      paymentId: 'pay_123',
      dealId: 10,
      amount: 1000,
      status: 'succeeded',
    };

    it('Security: should return 403 if signature is invalid', async () => {
      mockBankAdapter.validateWebhookSignature.mockReturnValue(false);

      await request(app.getHttpServer())
        .post('/finance/webhook/tochka')
        .set('x-signature', 'invalid_sig')
        .send(webhookPayload)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid signature');
        });

      expect(escrowService.deposit).not.toHaveBeenCalled();
    });

    it('Security: should return 403 if signature header is missing', async () => {
      await request(app.getHttpServer())
        .post('/finance/webhook/tochka')
        .send(webhookPayload)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Missing signature');
        });
    });

    it('Idempotency: should process payment only once (1st time)', async () => {
      mockBankAdapter.validateWebhookSignature.mockReturnValue(true);
      mockTransactionsService.existsByExternalId.mockResolvedValue(false);
      // Баланс меньше общей суммы -> статус не меняется, уведомления не шлются
      mockEscrowService.getBalance.mockResolvedValue({ amountDeposited: 1000, totalAmount: 5000 });

      await request(app.getHttpServer())
        .post('/finance/webhook/tochka')
        .set('x-signature', 'valid_sig')
        .send(webhookPayload)
        .expect(200)
        .expect({ status: 'ok' });

      expect(transactionsService.existsByExternalId).toHaveBeenCalledWith('pay_123');
      expect(escrowService.deposit).toHaveBeenCalledWith(10, 1000);
      expect(transactionsService.linkExternalPaymentId).toHaveBeenCalledWith(10, 'pay_123');
    });

    it('Idempotency: should ignore duplicate webhook (2nd time)', async () => {
      mockBankAdapter.validateWebhookSignature.mockReturnValue(true);
      mockTransactionsService.existsByExternalId.mockResolvedValue(true);

      await request(app.getHttpServer())
        .post('/finance/webhook/tochka')
        .set('x-signature', 'valid_sig')
        .send(webhookPayload)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.message).toBe('Already processed');
        });

      expect(escrowService.deposit).not.toHaveBeenCalled();
    });

    it('Logic: should update deal status to PAID if fully funded', async () => {
      mockBankAdapter.validateWebhookSignature.mockReturnValue(true);
      mockTransactionsService.existsByExternalId.mockResolvedValue(false);
      
      // Баланс равен сумме -> статус меняется
      mockEscrowService.getBalance.mockResolvedValue({ 
        amountDeposited: 5000, 
        totalAmount: 5000 
      });

      await request(app.getHttpServer())
        .post('/finance/webhook/tochka')
        .set('x-signature', 'valid_sig')
        .send({ ...webhookPayload, amount: 5000 })
        .expect(200);

      expect(escrowService.deposit).toHaveBeenCalled();
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { dealStatusId: 3 }, // 3 = PAID
        })
      );
      
      // Проверяем, что была попытка найти пользователей для уведомления
      // (так как статус сменился на PAID)
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });
});