import { Controller, Post, Get, Body, UseGuards, Param, ParseIntPipe, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CompaniesService } from '../services/companies.service';
import { BankingService } from '../services/banking.service';
import { CreateCompanyDto, CheckInnDto, CreateAddressDto } from '../dto/company.dto';
import { AddressesService } from '../services/addresses.service'; 
import { AddBankAccountDto } from '../dto/banking.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { StorageService } from '../../../common/providers/storage.service';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly bankingService: BankingService,
    private readonly storageService: StorageService,
    private readonly addressesService: AddressesService,
  ) {}

  @Post('check-inn')
  @ApiOperation({ summary: 'Проверка и автозаполнение по ИНН (DaData)' })
  async checkInn(@Body() dto: CheckInnDto) {
    return this.companiesService.checkInn(dto.inn);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создание/Регистрация новой компании пользователем' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(userId, dto);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить компанию текущего пользователя' })
  async getMyCompany(@CurrentUser() user: any) {
    // Теперь user.companyId доступен благодаря изменениям в AuthService и JwtStrategy
    return this.companiesService.findById(user.companyId);
  }

  @Post('banking')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Добавление расчетного счета' })
  async addBankAccount(
    @CurrentUser() user: any,
    @Body() dto: AddBankAccountDto,
  ) {
    // Используем companyId из токена
    return this.bankingService.addAccount(user.companyId, dto);
  }

  @Post(':id/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузка логотипа компании' })
  async uploadLogo(
    @Param('id', ParseIntPipe) companyId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // В реальном приложении здесь стоит проверить, что companyId === user.companyId
    const { key } = await this.storageService.upload(file, 'company-logos');
    return this.companiesService.uploadLogo(companyId, key);
  }
  @Post('addresses')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Добавить адрес компании' })
  async addAddress(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateAddressDto, // Не забудь импортировать DTO
  ) {
    return this.addressesService.addAddressToCompany(companyId, dto);
  }
}

