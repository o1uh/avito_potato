import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompanyDto } from '../dto/company.dto';
import { CounterpartyService } from '../../../common/providers/counterparty.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly counterpartyService: CounterpartyService,
  ) {}

  async checkInn(inn: string) {
    return this.counterpartyService.checkByInn(inn);
  }

  async create(userId: number, dto: CreateCompanyDto) {
    // 1. Проверяем, есть ли уже у пользователя компания (если логика 1 юзер = 1 компания)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    // В текущей схеме companyId обязателен у User, и он создается при регистрации.
    // Этот метод скорее используется для обновления данных созданной "заглушки" компании или создания новой, 
    // если пользователь хочет сменить юрлицо. 
    // Для соответствия ТЗ (POST /companies) реализуем создание новой.

    try {
      // Ищем дефолтный тип организации, если нужно (здесь предполагаем, что он есть или берем из DTO)
      const defaultOrgType = await this.prisma.organizationType.findFirst();

      const company = await this.prisma.company.create({
        data: {
          name: dto.name,
          inn: dto.inn,
          kpp: dto.kpp,
          ogrn: dto.ogrn,
          description: dto.description,
          organizationTypeId: defaultOrgType?.id || 1, // В реальности нужно мапить из названия или DTO
          // Привязываем пользователя как создателя (в данной схеме User.companyId)
          // Но так как связь User -> Company (N:1), мы должны обновить юзера
        },
      });

      // Привязываем текущего пользователя к новой компании
      await this.prisma.user.update({
        where: { id: userId },
        data: { companyId: company.id },
      });

      return company;

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Обработка нарушения CHECK constraint (P2010 - raw query error, но Prisma может вернуть P2000-P2003 в зависимости от версии)
        // Для Constraints обычно ошибка "new row for relation ... violates check constraint"
        if (error.code === 'P2010' || error.message.includes('check_inn_valid')) {
           throw new BadRequestException('Некорректный ИНН (ошибка валидации контрольной суммы)');
        }
        if (error.code === 'P2002') {
          throw new BadRequestException('Компания с таким ИНН уже существует');
        }
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
        verificationStatus: true 
      },
    });
  }

  // Заглушка для загрузки документов (будет расширено в DocumentsModule)
  async uploadLogo(companyId: number, fileKey: string) {
    // Здесь должна быть логика сохранения ключа файла в БД компании
    // Пока в модели Company нет поля logoUrl, пропустим изменение БД
    this.logger.log(`Logo uploaded for company ${companyId}: ${fileKey}`);
    return { success: true, key: fileKey };
  }
}