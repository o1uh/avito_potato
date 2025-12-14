import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // Added
import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { DocumentsModule } from '../documents/documents.module';
import { CommunicationModule } from '../communication/communication.module';

import { RfqService } from './services/rfq.service';
import { OffersService } from './services/offers.service';
import { DealsService } from './services/deals.service';
import { ShipmentService } from './services/shipment.service'; // Added

import { RfqController } from './controllers/rfq.controller';
import { OffersController } from './controllers/offers.controller';
import { DealsController } from './controllers/deals.controller';
import { ShipmentController } from './controllers/shipment.controller'; // Added
import { DevTradeController } from './controllers/dev-trade.controller'; 

import { CdekAdapter } from './adapters/cdek.adapter'; // Added
import { TrackingPollTask } from './tasks/tracking-poll.task'; // Added

@Module({
  imports: [
    PrismaModule,
    FinanceModule, 
    DocumentsModule, 
    CommunicationModule,
    ScheduleModule.forRoot(), // Инициализация Cron
  ],
  controllers: [
    RfqController, 
    OffersController, 
    DealsController, 
    ShipmentController, // Added
    DevTradeController
  ],
  providers: [
    RfqService, 
    OffersService, 
    DealsService, 
    ShipmentService, // Added
    CdekAdapter, // Added
    TrackingPollTask, // Added
  ],
})
export class TradeModule {}