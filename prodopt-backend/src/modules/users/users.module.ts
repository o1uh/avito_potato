import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { CompaniesService } from './services/companies.service'; // Added
import { BankingService } from './services/banking.service'; // Added
import { UsersController } from './controllers/users.controller';
import { CompaniesController } from './controllers/companies.controller'; // Added
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module'; // Added for Storage/Counterparty

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [UsersController, CompaniesController],
  providers: [UsersService, CompaniesService, BankingService],
  exports: [UsersService, CompaniesService],
})
export class UsersModule {}