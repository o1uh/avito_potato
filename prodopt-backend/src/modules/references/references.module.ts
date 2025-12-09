import { Module } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../prisma/prisma.module'; // Импортируем наш новый модуль

@Module({
  imports: [
    PrismaModule, 
    CacheModule.register({
      ttl: 3600000, // 1 час (в миллисекундах для версии v5+, в секундах для v4)
      max: 100, // Максимальное кол-во элементов в кэше
    }),
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService],
})
export class ReferencesModule {}