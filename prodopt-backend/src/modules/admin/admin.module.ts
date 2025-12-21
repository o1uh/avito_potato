import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // <--- Импорт
import { AdminController } from './controllers/admin.controller';
import { UsersManagementController } from './controllers/users-management.controller';
import { ModerationService } from './services/moderation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // --- ДОБАВИТЬ ЭТОТ БЛОК ---
    BullModule.registerQueue({
      name: 'catalog-sync',
    }),
    // ---------------------------
  ],
  controllers: [AdminController, UsersManagementController],
  providers: [ModerationService],
})
export class AdminModule {}