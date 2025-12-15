import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Logger, Get, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BankWebhookGuard } from '../guards/bank-webhook.guard';
import { EscrowService } from '../services/escrow.service';
import { TransactionsService } from '../services/transactions.service';
import { TochkaBankAdapter } from '../adapters/tochka-bank.adapter';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DealStatus } from '../../trade/utils/deal-state-machine';
import { PrismaService } from '../../../prisma/prisma.service';

// DTO для вебхука (примерная структура от банка)
class WebhookDto {
  paymentId: string;
  dealId: number; // Обычно передается в metadata платежа
  amount: number;
  status: 'succeeded' | 'canceled';
}

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly escrowService: EscrowService,
    private readonly transactionsService: TransactionsService,
    private readonly bankAdapter: TochkaBankAdapter,
    private readonly prisma: PrismaService, // Для проверки прав на сделку при генерации ссылки
  ) {}

  @Post('webhook/tochka')
  @UseGuards(BankWebhookGuard)
  @ApiHeader({ name: 'x-signature', description: 'HMAC signature from bank' })
  @ApiOperation({ summary: 'Вебхук от банка (уведомление об оплате)' })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() dto: WebhookDto) {
    this.logger.log(`Received webhook: ${JSON.stringify(dto)}`);

    if (dto.status !== 'succeeded') {
      this.logger.warn(`Payment ${dto.paymentId} not succeeded: ${dto.status}`);
      return { status: 'ignored' };
    }

    // 1. Идемпотентность: проверяем, не обрабатывали ли мы уже этот платеж
    const isProcessed = await this.transactionsService.existsByExternalId(dto.paymentId);
    if (isProcessed) {
      this.logger.log(`Payment ${dto.paymentId} already processed`);
      return { status: 'ok', message: 'Already processed' };
    }

    try {
      // 2. Зачисляем средства на эскроу (вызов хранимой процедуры)
      await this.escrowService.deposit(dto.dealId, dto.amount);

      // 3. Привязываем ID транзакции банка к созданной транзакции в БД
      await this.transactionsService.linkExternalPaymentId(dto.dealId, dto.paymentId);

      // 4. Проверяем баланс и обновляем статус сделки
      const balance = await this.escrowService.getBalance(dto.dealId);
      
      // Если сумма на счете >= суммы сделки -> переводим в PAID
      if (Number(balance.amountDeposited) >= Number(balance.totalAmount)) {
         await this.prisma.deal.update({
           where: { id: dto.dealId },
           data: { dealStatusId: DealStatus.PAID }
         });
         this.logger.log(`Deal ${dto.dealId} fully funded. Status -> PAID.`);
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error processing payment ${dto.paymentId}`, error);
      // Возвращаем 500, чтобы банк повторил попытку позже
      throw error;
    }
  }

  @Post('deals/:id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сгенерировать ссылку на оплату сделки' })
  async createPayment(
    @Param('id', ParseIntPipe) dealId: number,
    @CurrentUser('companyId') companyId: number
  ) {
    const deal = await this.prisma.deal.findUnique({ 
        where: { id: dealId },
        include: { escrowAccount: true }
    });

    if (!deal) throw new BadRequestException('Deal not found');
    if (deal.buyerCompanyId !== companyId) throw new BadRequestException('Only buyer can pay');
    if (deal.dealStatusId !== DealStatus.AGREED) throw new BadRequestException('Deal is not ready for payment');

    const amountToPay = Number(deal.totalAmount) - Number(deal.escrowAccount?.amountDeposited || 0);

    if (amountToPay <= 0) {
        return { message: 'Already paid' };
    }

    const linkData = await this.bankAdapter.createPaymentLink({
        amount: amountToPay,
        dealId: deal.id,
        description: `Оплата по сделке #${deal.id}`
    });

    return linkData;
  }
}