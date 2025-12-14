import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { CreateEscrowDto } from '../dto/create-escrow.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Создание эскроу-счета при переходе сделки в статус AGREED
   */
  async create(dto: CreateEscrowDto, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const fee = this.commissionService.calculate(dto.totalAmount);

    try {
      return await client.escrowAccount.create({
        data: {
          dealId: dto.dealId,
          totalAmount: dto.totalAmount,
          amountDeposited: 0,
          platformFeeAmount: fee,
          escrowStatusId: 1, // 1 = Waiting Payment
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create escrow for deal ${dto.dealId}`, error);
      throw new InternalServerErrorException('Could not create escrow account');
    }
  }

  /**
   * Пополнение счета (Вход денег)
   * Вызывает хранимую процедуру process_escrow
   */
  async deposit(dealId: number, amount: number) {
    return this.callProcedure(dealId, amount, 'DEPOSIT');
  }

  /**
   * Выплата продавцу (Завершение сделки)
   */
  async release(dealId: number) {
    // Получаем счет, чтобы узнать текущий баланс для release
    const account = await this.prisma.escrowAccount.findUnique({ where: { dealId } });
    if (!account) throw new Error('Escrow account not found');

    // Выплачиваем сумму за вычетом комиссии
    const amountToRelease = Number(account.amountDeposited) - Number(account.platformFeeAmount);
    
    if (amountToRelease <= 0) {
        this.logger.warn(`Release amount <= 0 for deal ${dealId}`);
        return; 
    }

    // TODO: Здесь должен быть вызов Payout Service (взаимодействие с банком)
    // Сейчас мы просто обновляем баланс внутри БД через процедуру
    await this.callProcedure(dealId, amountToRelease, 'RELEASE');
    
    // Записываем комиссию как отдельную операцию (опционально, зависит от бухгалтерии)
    // В данном MVP комиссия просто остается на счету (разница между deposit и release)
  }

  /**
   * Возврат средств покупателю (Арбитраж/Отмена)
   */
  async refund(dealId: number, amount: number) {
    return this.callProcedure(dealId, amount, 'REFUND');
  }

  async getBalance(dealId: number) {
    return this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
  }

  /**
   * Приватный метод вызова PL/pgSQL процедуры
   */
  private async callProcedure(dealId: number, amount: number, operation: 'DEPOSIT' | 'RELEASE' | 'REFUND') {
    try {
      // Используем $executeRawUnsafe или $executeRaw для вызова CALL
      // Важно: Prisma 5+ поддерживает типизированные запросы, но для CALL часто нужен Raw
      await this.prisma.$executeRaw`CALL process_escrow(${dealId}, ${amount}, ${operation})`;
      
      this.logger.log(`Escrow operation ${operation} success for deal ${dealId}, amount: ${amount}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Escrow procedure failed: ${error.message}`, error);
      // Пробрасываем ошибку, чтобы вызывающий сервис (например Trade) знал о сбое
      throw new InternalServerErrorException(error.message);
    }
  }
}