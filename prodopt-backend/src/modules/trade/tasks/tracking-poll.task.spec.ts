import { Test, TestingModule } from '@nestjs/testing';
import { TrackingPollTask } from './tracking-poll.task';
import { PrismaService } from '../../../prisma/prisma.service';
import { CdekAdapter } from '../adapters/cdek.adapter';
import { NotificationsService } from '../../communication/services/notifications.service';

describe('TrackingPollTask', () => {
  let task: TrackingPollTask;
  let prisma: PrismaService;
  let cdekAdapter: CdekAdapter;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    shipment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockCdekAdapter = {
    getTrackingStatus: jest.fn(),
  };

  const mockNotificationsService = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingPollTask,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CdekAdapter, useValue: mockCdekAdapter },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    task = module.get<TrackingPollTask>(TrackingPollTask);
    prisma = module.get<PrismaService>(PrismaService);
    cdekAdapter = module.get<CdekAdapter>(CdekAdapter);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update shipment status to DELIVERED and notify buyer', async () => {
    const mockShipment = {
      id: 100,
      trackingNumber: 'TEST-123',
      deliveryStatusId: 1,
      deal: {
        id: 50,
        buyerCompanyId: 10,
        dealStatusId: 4, // SHIPPED
        buyer: { name: 'Buyer Co' }
      },
    };

    const mockBuyerUser = { id: 555, email: 'buyer@test.com' };

    // 2. Настройка моков
    mockPrisma.shipment.findMany.mockResolvedValue([mockShipment]);
    
    // Эмулируем ответ от СДЭК: Доставлено
    mockCdekAdapter.getTrackingStatus.mockResolvedValue({
      status: 'DELIVERED',
      updatedAt: new Date(),
    });

    // Находим пользователей покупателя для уведомления
    mockPrisma.user.findMany.mockResolvedValue([mockBuyerUser]);

    // 3. Запуск Cron-задачи
    await task.handleCron();

    // 4. Проверки
    expect(cdekAdapter.getTrackingStatus).toHaveBeenCalledWith('TEST-123');

    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 100 },
        data: expect.objectContaining({ deliveryStatusId: 2 }),
      }),
    );

    expect(notificationsService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 555, // Проверяем, что ID передался
        toEmail: 'buyer@test.com',
        subject: 'Ваш заказ доставлен',
        template: 'notification',
        type: 'SUCCESS', // Проверяем тип, который мы добавили в коде
      }),
    );
  });

  it('should do nothing if status is still IN_TRANSIT', async () => {
    const mockShipment = {
      id: 101,
      trackingNumber: 'TEST-WAY',
      deliveryStatusId: 1,
      deal: { id: 51, buyerCompanyId: 11, dealStatusId: 4 },
    };

    mockPrisma.shipment.findMany.mockResolvedValue([mockShipment]);
    mockCdekAdapter.getTrackingStatus.mockResolvedValue({
      status: 'IN_TRANSIT',
      updatedAt: new Date(),
    });

    await task.handleCron();

    expect(mockPrisma.shipment.update).not.toHaveBeenCalled();
    expect(notificationsService.send).not.toHaveBeenCalled();
  });
});