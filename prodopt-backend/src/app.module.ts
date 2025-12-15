import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { HealthModule } from './modules/health/health.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CommunicationModule } from './modules/communication/communication.module';
import { PrismaModule } from './prisma/prisma.module'; 
import { ReferencesModule } from './modules/references/references.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module'; 
import { DocumentsModule } from './modules/documents/documents.module'; 
import { FinanceModule } from './modules/finance/finance.module';
import { NetworkingModule } from './modules/networking/networking.module';
import { TradeModule } from './modules/trade/trade.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GovernanceModule } from './modules/governance/governance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: validationSchema,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule, 
    CommonModule,
    HealthModule,
    CommunicationModule,
    ReferencesModule,
    AuthModule,
    UsersModule,
    CatalogModule, 
    DocumentsModule,
    FinanceModule,
    NetworkingModule,
    TradeModule,
    AdminModule,
    AnalyticsModule,
    GovernanceModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}