import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { HealthModule } from './modules/health/health.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CommunicationModule } from './modules/communication/communication.module';
import { PrismaModule } from './prisma/prisma.module'; 
import { ReferencesModule } from './modules/references/references.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: validationSchema,
    }),
    PrismaModule, 
    CommonModule,
    HealthModule,
    CommunicationModule,
    ReferencesModule, 
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}