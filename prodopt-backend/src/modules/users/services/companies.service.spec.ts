import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CounterpartyService } from '../../../common/providers/counterparty.service';
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
  };

  const mockCounterpartyService = {
    checkByInn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CounterpartyService, useValue: mockCounterpartyService },
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

    it('Ownership: should create company and link it to the user', async () => {
      // 1. Мокаем поиск юзера
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      // 2. Мокаем создание компании
      mockPrisma.company.create.mockResolvedValue({ id: 100, ...dto });
      // 3. Мокаем обновление юзера
      mockPrisma.user.update.mockResolvedValue({ id: userId, companyId: 100 });

      const result = await service.create(userId, dto);

      expect(result.id).toEqual(100);
      
      // Проверяем, что создалась компания
      expect(mockPrisma.company.create).toHaveBeenCalled();
      
      // Проверяем, что юзер обновился (Ownership)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { companyId: 100 },
      });
    });

    it('DB Constraint Validation: should throw BadRequestException on Invalid INN (Check Constraint)', async () => {
      // Имитируем ошибку БД, которую выбросит PostgreSQL при нарушении CHECK constraint
      // Prisma оборачивает её в PrismaClientKnownRequestError с кодом P2010 (или подобным)
      const dbError = new Prisma.PrismaClientKnownRequestError(
        'new row for relation "companies" violates check constraint "check_inn_valid"',
        {
          code: 'P2010',
          clientVersion: '5.0.0',
          meta: { target: ['check_inn_valid'] },
        }
      );

      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.company.create.mockRejectedValue(dbError);

      // Ожидаем, что сервис перехватит ошибку БД и выбросит BadRequestException
      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(userId, dto)).rejects.toThrow('Некорректный ИНН');
    });
  });
});