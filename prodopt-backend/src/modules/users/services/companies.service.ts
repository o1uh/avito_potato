import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompanyDto } from '../dto/company.dto';
import { CounterpartyService } from '../../../common/providers/counterparty.service';
import { AddressesService } from './addresses.service'; // Импорт

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counterpartyService: CounterpartyService,
    private readonly addressesService: AddressesService, // Инжект
  ) {}

  async checkInn(inn: string) {
    return this.counterpartyService.checkByInn(inn);
  }

  async create(userId: number, dto: CreateCompanyDto) {
    try {
        // 1. Получаем полные данные от DaData (включая структуру адреса)
        // Делаем это ДО транзакции, чтобы не держать соединение с БД пока ходим во внешний API
        const daDataInfo = await this.counterpartyService.checkByInn(dto.inn);

        const defaultOrgType = await this.prisma.organizationType.findFirst();

        // 2. Транзакция: Создание компании + Обновление юзера
        const company = await this.prisma.$transaction(async (tx) => {
            const newCompany = await tx.company.create({
                data: {
                    name: daDataInfo.name, // Берем официальное название
                    inn: dto.inn,
                    kpp: daDataInfo.kpp || dto.kpp,
                    ogrn: daDataInfo.ogrn || dto.ogrn,
                    description: dto.description,
                    organizationTypeId: defaultOrgType?.id || 1,
                },
            });

            // Привязываем текущего пользователя к новой компании
            await tx.user.update({
                where: { id: userId },
                data: { companyId: newCompany.id },
            });
            
            return newCompany;
        });

        // 3. Создаем адрес (отдельно, т.к. addressesService использует свой prisma client)
        // В идеале передавать tx в addressesService, но для простоты делаем так.
        if (daDataInfo.address && daDataInfo.address.data) {
            await this.addressesService.createLegalAddress(company.id, daDataInfo.address.data);
        }

        return company;

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Компания с таким ИНН уже существует');
        }
        if (error.code === 'P2010' && error.message.includes('check_inn_valid')) {
           throw new BadRequestException('Некорректный ИНН (ошибка валидации контрольной суммы)');
        }
      }
      
      if (error.message && error.message.includes('check_inn_valid')) {
          throw new BadRequestException('Некорректный ИНН (ошибка валидации контрольной суммы)');
      }

      this.logger.error(error);
      throw error;
    }
  }

  async findById(id: number) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { 
        organizationType: true, 
        verificationStatus: true,
        addresses: { include: { address: true, addressType: true } } // Подгружаем адреса
      },
    });
  }

  async uploadLogo(companyId: number, fileKey: string) {
    this.logger.log(`Logo uploaded for company ${companyId}: ${fileKey}`);
    return { success: true, key: fileKey };
  }
}