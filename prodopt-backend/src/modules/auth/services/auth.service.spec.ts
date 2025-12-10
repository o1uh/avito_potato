import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

// Мокаем библиотеку argon2
jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    update: jest.fn(),
  };

  // Исправленный мок Prisma
  const mockPrismaService = {
    company: { 
      findUnique: jest.fn(),
      create: jest.fn(), // Добавлено
    },
    user: {
      create: jest.fn(), // Добавлено
    },
    organizationType: { 
      findFirst: jest.fn().mockResolvedValue({ id: 1 }) 
    },
    // Имитация транзакции: просто вызываем колбэк, передавая этот же объект (mockPrismaService) как tx
    $transaction: jest.fn((callback) => callback(mockPrismaService)), 
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('test-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
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
    it('should hash password and create user', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        companyName: 'Test Co',
        inn: '1234567890',
        phone: '123',
      };

      // Настройка моков
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.findByEmail.mockResolvedValue(null); // Юзера нет
      mockPrismaService.company.findUnique.mockResolvedValue(null); // Компании нет
      
      // Настраиваем возвращаемые значения для create методов
      mockPrismaService.company.create.mockResolvedValue({ id: 100 });
      mockPrismaService.user.create.mockResolvedValue({ id: 1, email: dto.email });

      await service.register(dto);

      // Проверка: был ли вызван хеш
      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      
      // Проверка: создалась ли компания
      expect(mockPrismaService.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.companyName,
            inn: dto.inn,
          }),
        })
      );

      // Проверка: создался ли юзер (с хешированным паролем)
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'hashed_password',
            email: dto.email,
            companyId: 100, // ID созданной компании
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should return tokens if validation succeeds', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = { 
        id: 1, 
        email: 'test@example.com', 
        passwordHash: 'hashed_password' 
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'test-token',
        refreshToken: 'test-token',
      });
      
      // Проверка генерации токенов с правильным пейлоадом
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, email: user.email }),
        expect.any(Object),
      );
    });
  });
});