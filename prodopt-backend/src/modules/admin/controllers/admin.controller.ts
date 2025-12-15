import { Controller, Get, UseGuards, ForbiddenException, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ModerationService } from '../services/moderation.service';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Admin: General')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Дашборд админа (общая статистика)' })
  async getDashboard(@CurrentUser('role') role: number) {
    if (role !== 1) throw new ForbiddenException();

    const [users, companies, deals, disputes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.company.count(),
      this.prisma.deal.count({ where: { dealStatusId: 5 } }), // Completed
      this.prisma.dispute.count({ where: { disputeStatusId: 1 } }), // Open
    ]);

    return { users, companies, successfulDeals: deals, activeDisputes: disputes };
  }

  @Get('moderation/products')
  @ApiOperation({ summary: 'Очередь товаров на модерацию' })
  async getModerationQueue(@CurrentUser('role') role: number) {
    if (role !== 1) throw new ForbiddenException();
    return this.moderationService.getPendingProducts();
  }

  @Patch('moderation/products/:id/approve')
  @ApiOperation({ summary: 'Одобрить товар' })
  async approveProduct(@Param('id', ParseIntPipe) id: number, @CurrentUser('role') role: number, @CurrentUser('sub') adminId: number) {
    if (role !== 1) throw new ForbiddenException();
    return this.moderationService.approveProduct(id, adminId);
  }
}