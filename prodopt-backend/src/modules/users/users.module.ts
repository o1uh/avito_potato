import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { CompaniesService } from './services/companies.service';
import { BankingService } from './services/banking.service';
import { AddressesService } from './services/addresses.service'; // Импорт
import { UsersController } from './controllers/users.controller';
import { CompaniesController } from './controllers/companies.controller';
import { TeamController } from './controllers/team.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [UsersController, CompaniesController, TeamController],
  // Добавляем AddressesService в providers и exports
  providers: [UsersService, CompaniesService, BankingService, AddressesService],
  exports: [UsersService, CompaniesService, AddressesService], 
})
export class UsersModule {}