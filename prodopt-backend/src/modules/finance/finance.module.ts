import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EscrowService } from './services/escrow.service';
import { CommissionService } from './services/commission.service';
import { TransactionsService } from './services/transactions.service';
import { FinanceController } from './controllers/finance.controller';
import { TochkaBankAdapter } from './adapters/tochka-bank.adapter';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [FinanceController],
  providers: [
    EscrowService, 
    CommissionService, 
    TransactionsService,
    TochkaBankAdapter, // Регистрируем адаптер
  ],
  exports: [EscrowService, TransactionsService], 
})
export class FinanceModule {}