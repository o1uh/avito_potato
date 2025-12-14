import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EscrowService } from './services/escrow.service';
import { CommissionService } from './services/commission.service';
import { TransactionsService } from './services/transactions.service';
// Контроллер пока не добавляем, так как API чисто внутреннее (согласно ТЗ Этап 8)

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [EscrowService, CommissionService, TransactionsService],
  exports: [EscrowService, TransactionsService], // Экспортируем для использования в TradeModule
})
export class FinanceModule {}