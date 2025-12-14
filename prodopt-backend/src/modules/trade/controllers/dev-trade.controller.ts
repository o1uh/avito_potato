import { Controller, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator'; 
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { EscrowService } from '../../finance/services/escrow.service';
import { DealsService } from '../services/deals.service';
import { DealStatus } from '../utils/deal-state-machine';

// Создаем DTO для валидации входных данных
class DepositDto {
  @ApiProperty({ example: 50000, description: 'Сумма пополнения' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

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
    @Body() dto: DepositDto, // Используем DTO вместо @Body('amount')
  ) {
    // Используем dto.amount
    await this.escrowService.deposit(dealId, dto.amount);

    const balance = await this.escrowService.getBalance(dealId);
    
    // Проверка полной оплаты
    if (Number(balance.amountDeposited) >= Number(balance.totalAmount)) {
       const prisma = (this.dealsService as any).prisma;
       await prisma.deal.update({
         where: { id: dealId },
         data: { dealStatusId: DealStatus.PAID }
       });
       
       return { status: 'PAID', message: 'Funds deposited and deal status updated' };
    }

    return { status: 'PARTIAL', message: `Deposited. Current: ${balance.amountDeposited}/${balance.totalAmount}` };
  }
}