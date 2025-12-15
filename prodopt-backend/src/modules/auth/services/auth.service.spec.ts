import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// Импортируем моки для новых зависимостей
import { CounterpartyService } from '../../../common/providers/counterparty.service';
import { AddressesService } from '../../users/services/addresses.service';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaService = {
    company: { 
      findUnique: jest.fn(),
      create: jest.fn(), 
    },
    user: {
      create: jest.fn(), 
    },
    organizationType: { 
      findFirst: jest.fn().mockResolvedValue({ id: 1 }) 
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)), 
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('test-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret'),
  };

  // Мок для CounterpartyService
  const mockCounterpartyService = {
    checkByInn: jest.fn().mockResolvedValue({
        name: 'Mock Company',
        inn: '1234567890',
        address: { data: {} }
    }),
  };

  // Мок для AddressesService
  const mockAddressesService = {
    createLegalAddress: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        // Добавляем провайдеры
        { provide: CounterpartyService, useValue: mockCounterpartyService },
        { provide: AddressesService, useValue: mockAddressesService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash password, create user and fetch address', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        companyName: 'Test Co',
        inn: '1234567890',
        phone: '123',
      };

      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.findByEmail.mockResolvedValue(null); 
      mockPrismaService.company.findUnique.mockResolvedValue(null); 
      
      mockPrismaService.company.create.mockResolvedValue({ id: 100 });
      mockPrismaService.user.create.mockResolvedValue({ id: 1, email: dto.email, companyId: 100 });

      await service.register(dto);

      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      
      // Проверка вызова DaData
      expect(mockCounterpartyService.checkByInn).toHaveBeenCalledWith(dto.inn);

      expect(mockPrismaService.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Mock Company', // Должно взяться из мока DaData
            inn: dto.inn,
          }),
        })
      );

      // Проверка вызова создания адреса
      expect(mockAddressesService.createLegalAddress).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return tokens if validation succeeds', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = { 
        id: 1, 
        email: 'test@example.com', 
        passwordHash: 'hashed_password',
        isActive: true, 
        companyId: 1, 
        roleInCompanyId: 1 
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'test-token',
        refreshToken: 'test-token',
      });
    });
  });
});