import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { DocumentsModule } from '../documents/documents.module';
import { CommunicationModule } from '../communication/communication.module';
import { UsersModule } from '../users/users.module'; // Импортируем UsersModule

import { RfqService } from './services/rfq.service';
import { OffersService } from './services/offers.service';
import { DealsService } from './services/deals.service';
import { ShipmentService } from './services/shipment.service';

import { RfqController } from './controllers/rfq.controller';
import { OffersController } from './controllers/offers.controller';
import { DealsController } from './controllers/deals.controller';
import { ShipmentController } from './controllers/shipment.controller';
import { DevTradeController } from './controllers/dev-trade.controller'; 

import { CdekAdapter } from './adapters/cdek.adapter';
import { TrackingPollTask } from './tasks/tracking-poll.task';

@Module({
  imports: [
    PrismaModule,
    FinanceModule, 
    DocumentsModule, 
    CommunicationModule,
    UsersModule, // Добавили сюда, чтобы использовать AddressesService
    ScheduleModule.forRoot(),
  ],
  controllers: [
    RfqController, 
    OffersController, 
    DealsController, 
    ShipmentController, 
    DevTradeController
  ],
  providers: [
    RfqService, 
    OffersService, 
    DealsService, 
    ShipmentService,
    CdekAdapter,
    TrackingPollTask,
  ],
})
export class TradeModule {}