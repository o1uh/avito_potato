import { Controller, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { EscrowService } from '../../finance/services/escrow.service';
import { DealsService } from '../services/deals.service';
import { DealStatus } from '../utils/deal-state-machine';

@ApiTags('Dev Tools (Test Only)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dev/trade')
export class DevTradeController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly dealsService: DealsService,
  ) {}

  @Post('deals/:id/deposit')
  @ApiOperation({ summary: '[DEV] Эмуляция оплаты сделки (переход в PAID)' })
  async manualDeposit(
    @Param('id', ParseIntPipe) dealId: number,
    @Body('amount') amount: number,
  ) {
    // 1. Зачисляем деньги на эскроу (вызов процедуры)
    await this.escrowService.deposit(dealId, amount);

    // 2. Проверяем баланс (в реальной системе это делает вебхук или процедура сама триггерит событие)
    const balance = await this.escrowService.getBalance(dealId);
    
    // 3. Если сумма полная, переводим сделку в PAID
    // Внимание: В реальной системе это должно быть защищено строже
    if (Number(balance.amountDeposited) >= Number(balance.totalAmount)) {
       // userId и companyId ставим заглушки или берем из контекста, 
       // так как это системное действие
       // В данном случае используем прямой update или метод сервиса с правами системы
       // Для теста просто обновляем статус через Prisma, чтобы не ломать логику прав в dealsService
       const prisma = (this.dealsService as any).prisma; // Хаки для теста :)
       await prisma.deal.update({
         where: { id: dealId },
         data: { dealStatusId: DealStatus.PAID }
       });
       
       return { status: 'PAID', message: 'Funds deposited and deal status updated' };
    }

    return { status: 'PARTIAL', message: `Deposited. Current: ${balance.amountDeposited}/${balance.totalAmount}` };
  }
}