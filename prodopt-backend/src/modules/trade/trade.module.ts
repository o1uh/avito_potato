import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { DocumentsModule } from '../documents/documents.module';
import { CommunicationModule } from '../communication/communication.module';

import { RfqService } from './services/rfq.service';
import { OffersService } from './services/offers.service';
import { DealsService } from './services/deals.service';

import { RfqController } from './controllers/rfq.controller';
import { OffersController } from './controllers/offers.controller';
import { DealsController } from './controllers/deals.controller';

import { DevTradeController } from './controllers/dev-trade.controller'; 

@Module({
  imports: [
    PrismaModule,
    FinanceModule, // Для Escrow
    DocumentsModule, // Для договоров
    CommunicationModule, // Для уведомлений
  ],
  controllers: [RfqController, OffersController, DealsController, DevTradeController],
  providers: [RfqService, OffersService, DealsService],
})
export class TradeModule {}