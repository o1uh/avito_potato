import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistoryByDeal(dealId: number) {
    return this.prisma.transaction.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      include: {
        status: true,
        type: true
      }
    });
  }

  /**
   * Проверка на идемпотентность: была ли уже обработана транзакция с таким ID от банка
   */
  async existsByExternalId(externalPaymentId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({
      where: { externalPaymentId },
    });
    return count > 0;
  }

  /**
   * Привязка внешнего ID к последней транзакции по сделке.
   * Т.к. хранимая процедура process_escrow создает транзакцию, но не знает про внешний ID,
   * мы обновляем запись сразу после вызова процедуры.
   */
  async linkExternalPaymentId(dealId: number, externalPaymentId: string) {
    // Находим последнюю транзакцию пополнения (Type 1 = Deposit) по этой сделке
    const lastTx = await this.prisma.transaction.findFirst({
      where: { 
        dealId, 
        transactionTypeId: 1 // Deposit
      },
      orderBy: { id: 'desc' },
    });

    if (lastTx) {
      await this.prisma.transaction.update({
        where: { id: lastTx.id },
        data: { externalPaymentId },
      });
    }
  }
}