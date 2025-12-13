import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { CompaniesService } from './services/companies.service';
import { BankingService } from './services/banking.service';
import { UsersController } from './controllers/users.controller';
import { CompaniesController } from './controllers/companies.controller';
import { TeamController } from './controllers/team.controller'; // Added
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [UsersController, CompaniesController, TeamController], // Added
  providers: [UsersService, CompaniesService, BankingService],
  exports: [UsersService, CompaniesService],
})
export class UsersModule {}