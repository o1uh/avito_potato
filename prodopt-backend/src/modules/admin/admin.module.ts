import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { UsersManagementController } from './controllers/users-management.controller';
import { ModerationService } from './services/moderation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, UsersManagementController],
  providers: [ModerationService],
})
export class AdminModule {}