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

  const mockEscrowService = { create: jest.fn(), release: jest.fn() };
  const mockDocumentsService = { createDocument: jest.fn() };
  const mockNotificationsService = { send: jest.fn() };

  const supplierInn = '7707083893'; 
  const buyerInn = '7702070139'; 

  // Вспомогательная функция очистки
  const cleanup = async () => {
    const inns = [supplierInn, buyerInn];
    for (const inn of inns) {
      const company = await prisma.company.findUnique({ where: { inn } });
      if (company) {
        await prisma.transaction.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        await prisma.escrowAccount.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        await prisma.dealItem.deleteMany({ where: { deal: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } } });
        await prisma.deal.deleteMany({ where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } });
        await prisma.companyStatistics.deleteMany({ where: { companyId: company.id } }); // Чистим статистику
        await prisma.user.deleteMany({ where: { companyId: company.id } });
        await prisma.company.delete({ where: { id: company.id } });
      }
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

    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('DB Trigger: Stats Update on Deal Completion', async () => {
    // 1. Создаем компании
    const orgType = await prisma.organizationType.findFirst();
    const supplier = await prisma.company.create({
      data: { name: 'Supplier Stats', inn: supplierInn, ogrn: '123', organizationTypeId: orgType?.id || 1 }
    });
    const buyer = await prisma.company.create({
      data: { name: 'Buyer Stats', inn: buyerInn, ogrn: '456', organizationTypeId: orgType?.id || 1 }
    });

    const dealAmount = 1000;

    // 2. Создаем сделку сразу в статусе SHIPPED (чтобы перевести в COMPLETED)
    const deal = await prisma.deal.create({
      data: {
        buyerCompanyId: buyer.id,
        supplierCompanyId: supplier.id,
        totalAmount: dealAmount,
        dealStatusId: DealStatus.SHIPPED,
      },
    });

    // 3. Завершаем сделку (через сервис или прямой апдейт, главное - триггер БД)
    await prisma.deal.update({
      where: { id: deal.id },
      data: { dealStatusId: DealStatus.COMPLETED },
    });

    // 4. Проверяем статистику Поставщика
    const supplierStats = await prisma.companyStatistics.findUnique({
      where: { companyId: supplier.id }
    });
    
    expect(supplierStats).toBeDefined();
    expect(supplierStats.totalDealsAsSupplier).toBe(1);
    // Приводим Decimal к Number или строке для проверки
    expect(Number(supplierStats.totalSalesVolume)).toBe(dealAmount);

    // 5. Проверяем статистику Покупателя
    const buyerStats = await prisma.companyStatistics.findUnique({
      where: { companyId: buyer.id }
    });

    expect(buyerStats).toBeDefined();
    expect(buyerStats.totalDealsAsBuyer).toBe(1);
    expect(Number(buyerStats.totalPurchasesVolume)).toBe(dealAmount);
  });
});