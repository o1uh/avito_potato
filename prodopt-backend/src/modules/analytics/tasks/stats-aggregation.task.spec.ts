import { Test, TestingModule } from '@nestjs/testing';
import { StatsAggregationTask } from './stats-aggregation.task';
import { PrismaService } from '../../../prisma/prisma.service';
import { DealStatus } from '../../trade/utils/deal-state-machine';

describe('StatsAggregationTask', () => {
  let task: StatsAggregationTask;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsAggregationTask,
        PrismaService,
      ],
    }).compile();

    task = module.get<StatsAggregationTask>(StatsAggregationTask);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should calculate total platform volume correctly', async () => {
    // Поскольку мы не можем легко очистить всю БД от сделок других тестов, 
    // мы создадим уникальные сделки и проверим, что функция aggregate их учитывает.
    // Но лучше просто проверить логику вызова.
    
    // 1. Создаем тестовые данные (фиктивные компании, чтобы не ломать FK)
    const orgType = await prisma.organizationType.findFirst();
    const tempCo = await prisma.company.create({
      data: { name: 'Temp Stats Co', inn: '7740000076', ogrn: '1', organizationTypeId: orgType?.id || 1 }
    });

    const amount1 = 5000;
    const amount2 = 7000;

    await prisma.deal.createMany({
      data: [
        { buyerCompanyId: tempCo.id, supplierCompanyId: tempCo.id, totalAmount: amount1, dealStatusId: DealStatus.COMPLETED },
        { buyerCompanyId: tempCo.id, supplierCompanyId: tempCo.id, totalAmount: amount2, dealStatusId: DealStatus.COMPLETED },
        { buyerCompanyId: tempCo.id, supplierCompanyId: tempCo.id, totalAmount: 10000, dealStatusId: DealStatus.CREATED }, // Не должна учитываться
      ]
    });

    // Шпионим за логгером, так как метод ничего не возвращает, а пишет в лог
    const loggerSpy = jest.spyOn(task['logger'], 'log');

    // 2. Запускаем задачу
    await task.handleCron();

    // 3. Получаем реальную сумму из БД для сверки
    const realTotal = await prisma.deal.aggregate({
      where: { dealStatusId: DealStatus.COMPLETED },
      _sum: { totalAmount: true }
    });

    // 4. Проверяем, что в лог ушла правильная сумма
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(`Total platform volume today: ${realTotal._sum.totalAmount}`));

    // Очистка
    await prisma.deal.deleteMany({ where: { buyerCompanyId: tempCo.id } });
    await prisma.company.delete({ where: { id: tempCo.id } });
  });
});