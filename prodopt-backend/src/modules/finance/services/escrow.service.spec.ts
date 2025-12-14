import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { CommissionService } from './commission.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('EscrowService', () => {
  let service: EscrowService;
  let prisma: PrismaService;
  let commissionService: CommissionService;

  // Мок PrismaService
  const mockPrisma = {
    escrowAccount: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(), // Для вызова CALL process_escrow
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { 
          provide: ConfigService, 
          useValue: { get: jest.fn(() => 2.0) } // Комиссия 2%
        },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
    prisma = module.get<PrismaService>(PrismaService);
    commissionService = module.get<CommissionService>(CommissionService);
  });

  afterEach(() => {
    // ВАЖНО: resetAllMocks сбрасывает и историю, и реализации (mockResolvedValue)
    jest.resetAllMocks(); 
  });

  // 1. Тест расчета комиссии и создания счета
  describe('create', () => {
    it('should calculate fee and create escrow account', async () => {
      const dto = { dealId: 100, totalAmount: 1000 };
      const expectedFee = 20;

      mockPrisma.escrowAccount.create.mockResolvedValue({
        dealId: 100,
        totalAmount: 1000,
        platformFeeAmount: expectedFee,
      });

      await service.create(dto);

      expect(mockPrisma.escrowAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dealId: 100,
          totalAmount: 1000,
          platformFeeAmount: expectedFee,
          amountDeposited: 0,
        }),
      });
    });
  });

  // 2. Тест пополнения (Deposit)
  describe('deposit', () => {
    it('should call stored procedure with DEPOSIT operation', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1); // Явно задаем успех

      await service.deposit(100, 500);

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('DB Connection Failed'));

      await expect(service.deposit(100, 500)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // 3. Тест выплаты (Release) - Самый важный
  describe('release', () => {
    it('should deduct fee and call stored procedure with RELEASE', async () => {
      const dealId = 100;
      
      // Настраиваем моки
      mockPrisma.escrowAccount.findUnique.mockResolvedValue({
        dealId,
        amountDeposited: 1000,
        platformFeeAmount: 20,
      });
      // ВАЖНО: Явно указываем успех для этого теста, чтобы перебить настройку из предыдущего теста
      mockPrisma.$executeRaw.mockResolvedValue(1); 

      await service.release(dealId);
      
      expect(mockPrisma.escrowAccount.findUnique).toHaveBeenCalledWith({ where: { dealId } });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should not call procedure if amount to release is <= 0', async () => {
      mockPrisma.escrowAccount.findUnique.mockResolvedValue({
        dealId: 100,
        amountDeposited: 10,
        platformFeeAmount: 20,
      });

      await service.release(100);

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  // 4. Тест точности вычислений
  describe('Calculations (CommissionService)', () => {
    it('should calculate percentage correctly', () => {
      expect(commissionService.calculate(150)).toBe(3);
      expect(commissionService.calculate(100.55)).toBe(2.01);
    });
  });
});