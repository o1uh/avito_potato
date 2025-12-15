import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { StatsAggregationTask } from './tasks/stats-aggregation.task';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [StatsAggregationTask],
})
export class AnalyticsModule {}