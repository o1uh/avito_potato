import { Test, TestingModule } from '@nestjs/testing';
import { CompanyReviewsService } from './company-reviews.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DealStatus } from '../../trade/utils/deal-state-machine';

describe('CompanyReviews & Rating Trigger', () => {
  let prisma: PrismaService;
  
  const supplierInn = '7728168971'; // Ашан
  const buyerInn = '9705114405';    // Яндекс

  const cleanup = async () => {
    const inns = [supplierInn, buyerInn];
    for (const inn of inns) {
      const company = await prisma.company.findUnique({ where: { inn } });
      if (company) {
        await prisma.companyReview.deleteMany({ where: { OR: [{ authorCompanyId: company.id }, { recipientCompanyId: company.id }] } });
        await prisma.deal.deleteMany({ where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } });
        await prisma.company.delete({ where: { id: company.id } });
      }
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyReviewsService,
        PrismaService,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('DB Trigger: Rating Update on New Review', async () => {
    // 1. Подготовка
    const orgType = await prisma.organizationType.findFirst();
    const supplier = await prisma.company.create({
      data: { name: 'Rating Test Supplier', inn: supplierInn, ogrn: '111', organizationTypeId: orgType?.id || 1, rating: 0 }
    });
    const buyer = await prisma.company.create({
      data: { name: 'Rating Test Buyer', inn: buyerInn, ogrn: '222', organizationTypeId: orgType?.id || 1 }
    });

    // Создаем две завершенные сделки
    const deal1 = await prisma.deal.create({
      data: { buyerCompanyId: buyer.id, supplierCompanyId: supplier.id, totalAmount: 100, dealStatusId: DealStatus.COMPLETED }
    });
    const deal2 = await prisma.deal.create({
      data: { buyerCompanyId: buyer.id, supplierCompanyId: supplier.id, totalAmount: 100, dealStatusId: DealStatus.COMPLETED }
    });

    // 2. Добавляем первый отзыв (Оценка 4)
    await prisma.companyReview.create({
      data: {
        dealId: deal1.id,
        authorCompanyId: buyer.id,
        recipientCompanyId: supplier.id,
        serviceRating: 4,
        serviceComment: 'Good',
        reviewStatusId: 2, // Published (чтобы триггер сработал)
      }
    });

    // Проверяем рейтинг (должен быть 4.0)
    let updatedSupplier = await prisma.company.findUnique({ where: { id: supplier.id } });
    expect(Number(updatedSupplier.rating)).toBe(4.0);

    // 3. Добавляем второй отзыв (Оценка 5)
    await prisma.companyReview.create({
      data: {
        dealId: deal2.id,
        authorCompanyId: buyer.id,
        recipientCompanyId: supplier.id,
        serviceRating: 5,
        serviceComment: 'Excellent',
        reviewStatusId: 2,
      }
    });

    // Проверяем рейтинг ( (4+5)/2 = 4.5 )
    updatedSupplier = await prisma.company.findUnique({ where: { id: supplier.id } });
    expect(Number(updatedSupplier.rating)).toBe(4.5);
  });
});