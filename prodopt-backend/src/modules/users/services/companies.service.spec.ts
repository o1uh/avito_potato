import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CounterpartyService } from '../../../common/providers/counterparty.service';
import { AddressesService } from './addresses.service'; // <--- Импорт
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationType: {
      findFirst: jest.fn().mockResolvedValue({ id: 1 }),
    },
    // Добавляем поддержку транзакций для мока
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockCounterpartyService = {
    checkByInn: jest.fn(),
  };

  // <--- Мок для AddressesService
  const mockAddressesService = {
    createLegalAddress: jest.fn(),
    getLegalAddressString: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CounterpartyService, useValue: mockCounterpartyService },
        { provide: AddressesService, useValue: mockAddressesService }, // <--- Внедрение
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 1;
    const dto = {
      name: 'Test Company',
      inn: '7736207543', // Valid INN format
      ogrn: '1234567890123',
    };

    const mockDaDataResponse = {
        name: 'Test Company',
        inn: '7736207543',
        address: { data: {} }
    };

    it('Ownership: should create company and link it to the user', async () => {
      // 1. Мокаем поиск юзера (не обязательно в новом коде, но оставим для совместимости)
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      
      // 2. Мокаем DaData
      mockCounterpartyService.checkByInn.mockResolvedValue(mockDaDataResponse);

      // 3. Мокаем создание компании
      mockPrisma.company.create.mockResolvedValue({ id: 100, ...dto });
      
      // 4. Мокаем обновление юзера
      mockPrisma.user.update.mockResolvedValue({ id: userId, companyId: 100 });

      const result = await service.create(userId, dto);

      expect(result.id).toEqual(100);
      
      // Проверяем, что создалась компания
      expect(mockPrisma.company.create).toHaveBeenCalled();
      
      // Проверяем, что вызвалось создание адреса
      expect(mockAddressesService.createLegalAddress).toHaveBeenCalled();

      // Проверяем, что юзер обновился (Ownership)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { companyId: 100 },
      });
    });

    it('DB Constraint Validation: should throw BadRequestException on Invalid INN', async () => {
      mockCounterpartyService.checkByInn.mockResolvedValue(mockDaDataResponse);

      // Имитируем ошибку БД
      const dbError = new Prisma.PrismaClientKnownRequestError(
        'new row for relation "companies" violates check constraint "check_inn_valid"',
        {
          code: 'P2010',
          clientVersion: '5.0.0',
          meta: { target: ['check_inn_valid'] },
        }
      );

      // В новой реализации ошибка падает на company.create внутри транзакции
      mockPrisma.company.create.mockRejectedValue(dbError);

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(userId, dto)).rejects.toThrow('Некорректный ИНН');
    });
  });
});