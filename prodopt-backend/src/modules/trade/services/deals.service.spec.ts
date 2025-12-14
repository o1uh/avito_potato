import { Test, TestingModule } from '@nestjs/testing';
import { DealsService } from './deals.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { NotificationsService } from '../../communication/services/notifications.service';
import { DealStatus } from '../utils/deal-state-machine';

describe('DealsService & DB Triggers', () => {
  let service: DealsService;
  let prisma: PrismaService;

  const mockEscrowService = { create: jest.fn() };
  const mockDocumentsService = { createDocument: jest.fn() };
  const mockNotificationsService = { send: jest.fn() };

  // ВАЖНО: Используем реальные валидные ИНН (Сбербанк и ВТБ)
  const validInn1 = '7707083893'; 
  const validInn2 = '7702070139'; 

  // Вспомогательная функция для каскадной очистки
  const cleanupCompany = async (inn: string) => {
    const company = await prisma.company.findUnique({ where: { inn } });
    if (company) {
      // Находим ID сделок этой компании
      const deals = await prisma.deal.findMany({
        where: {
          OR: [
            { buyerCompanyId: company.id },
            { supplierCompanyId: company.id }
          ]
        },
        select: { id: true }
      });
      const dealIds = deals.map(d => d.id);

      if (dealIds.length > 0) {
        // Удаляем зависимости (Эскроу, Транзакции, Позиции)
        // Игнорируем ошибки, если записей нет
        await prisma.transaction.deleteMany({ where: { dealId: { in: dealIds } } });
        await prisma.escrowAccount.deleteMany({ where: { dealId: { in: dealIds } } });
        await prisma.dealItem.deleteMany({ where: { dealId: { in: dealIds } } });

        // Удаляем сами сделки
        await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
      }

      // Удаляем офферы и запросы (чтобы не мешали удалению компании)
      await prisma.commercialOffer.deleteMany({ where: { supplierCompanyId: company.id } });
      await prisma.purchaseRequest.deleteMany({ where: { buyerCompanyId: company.id } });

      // Удаляем сотрудников (если каскад не сработал)
      await prisma.user.deleteMany({ where: { companyId: company.id } });

      // Удаляем саму компанию
      await prisma.company.delete({ where: { id: company.id } });
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        PrismaService,
        { provide: EscrowService, useValue: mockEscrowService },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Очистка перед каждым тестом
    await cleanupCompany(validInn1);
    await cleanupCompany(validInn2);
  });

  afterEach(async () => {
    // Чистка после тестов
    await cleanupCompany(validInn1);
    await cleanupCompany(validInn2);
  });

  it('DB Trigger: should prevent Illegal Status Transition (CREATED -> COMPLETED)', async () => {
    const orgType = await prisma.organizationType.findFirst();
    // Если справочник пуст (вдруг), создаем дефолтный тип
    const orgTypeId = orgType ? orgType.id : (await prisma.organizationType.create({ data: { name: 'ООО Test' } })).id;

    const company = await prisma.company.create({
      data: { 
        name: 'TestCo Trigger', 
        inn: validInn1, 
        ogrn: '1027700132195', 
        organizationTypeId: orgTypeId 
      }
    });
    
    const deal = await prisma.deal.create({
      data: {
        buyerCompanyId: company.id,
        supplierCompanyId: company.id, // Сам с собой для простоты теста триггера
        totalAmount: 1000,
        dealStatusId: DealStatus.CREATED,
      },
    });

    // Ожидаем ошибку БД при попытке некорректного обновления
    await expect(
      prisma.deal.update({
        where: { id: deal.id },
        data: { dealStatusId: DealStatus.COMPLETED },
      })
    ).rejects.toThrow(); 
  });

  it('DB Trigger: should prevent Price Change after AGREED status', async () => {
    const orgType = await prisma.organizationType.findFirst();
    const orgTypeId = orgType ? orgType.id : (await prisma.organizationType.create({ data: { name: 'ООО Test 2' } })).id;

    const company = await prisma.company.create({
      data: { 
        name: 'TestCo Price', 
        inn: validInn2, 
        ogrn: '1027700132195', 
        organizationTypeId: orgTypeId 
      }
    });

    // Создаем сделку сразу в статусе AGREED
    const deal = await prisma.deal.create({
      data: {
        buyerCompanyId: company.id,
        supplierCompanyId: company.id,
        totalAmount: 1000,
        dealStatusId: DealStatus.AGREED,
      },
    });

    // Пытаемся изменить сумму
    await expect(
      prisma.deal.update({
        where: { id: deal.id },
        data: { totalAmount: 5000 },
      })
    ).rejects.toThrow(); // Ожидаем "Cannot change deal amount after agreement"
  });
});