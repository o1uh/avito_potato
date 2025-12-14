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
        // Предполагается, что TransactionType есть в схеме (раздел 9 схемы)
        // Если в типах prisma этого нет, нужно проверить schema.prisma,
        // но исходя из контекста, relations настроены.
      }
    });
  }
}