import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('my-stats')
  @ApiOperation({ summary: 'Статистика моей компании' })
  async getMyStats(@CurrentUser('companyId') companyId: number) {
    // Данные берутся из материализованной таблицы company_statistics (обновляется триггером)
    const stats = await this.prisma.companyStatistics.findUnique({
      where: { companyId },
    });

    if (!stats) {
      return {
        totalSales: 0,
        totalPurchases: 0,
        salesVolume: 0,
        purchasesVolume: 0,
        message: 'No stats yet',
      };
    }

    return stats;
  }
}