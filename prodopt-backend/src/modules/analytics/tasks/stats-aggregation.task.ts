import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class StatsAggregationTask {
  private readonly logger = new Logger(StatsAggregationTask.name);

  constructor(private readonly prisma: PrismaService) {}

  // Запуск каждую ночь в 00:00. Пересчет глобальных метрик, если триггеры дали сбой
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting daily stats aggregation...');
    
    // Пример тяжелого запроса для пересчета, если статистика разъехалась
    // В реальном проекте лучше использовать триггеры, а тут делать бэкап или сложные отчеты
    const totalVolume = await this.prisma.deal.aggregate({
        where: { dealStatusId: 5 }, // Completed
        _sum: { totalAmount: true }
    });

    this.logger.log(`Total platform volume today: ${totalVolume._sum.totalAmount}`);
  }
}