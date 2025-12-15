import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger, // Добавлен Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
// Добавлены новые импорты
import { CounterpartyService } from '../../../common/providers/counterparty.service';
import { AddressesService } from '../../users/services/addresses.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    // Внедряем сервисы
    private counterpartyService: CounterpartyService,
    private addressesService: AddressesService,
  ) {}

  // Регистрация
  async register(dto: RegisterDto) {
    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) {
      throw new BadRequestException('User with this email already exists');
    }

    const companyExists = await this.prisma.company.findUnique({
      where: { inn: dto.inn },
    });
    if (companyExists) {
      throw new BadRequestException('Company with this INN already exists');
    }

    // 1. Получаем данные об организации (включая адрес) через DaData
    // Это нужно сделать ДО транзакции
    let daDataInfo;
    try {
        daDataInfo = await this.counterpartyService.checkByInn(dto.inn);
    } catch (e) {
        this.logger.warn(`DaData lookup failed for INN ${dto.inn}, using fallback data`);
        // Fallback, если сервис недоступен, чтобы не блокировать регистрацию
        daDataInfo = { 
            name: dto.companyName, 
            inn: dto.inn, 
            ogrn: '', 
            address: { data: {} } 
        };
    }

    const passwordHash = await argon2.hash(dto.password);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const defaultOrgType = await tx.organizationType.findFirst();
      
      const company = await tx.company.create({
        data: {
          name: daDataInfo.name || dto.companyName, // Предпочитаем официальное название
          inn: dto.inn,
          kpp: daDataInfo.kpp, // Сохраняем КПП если есть
          ogrn: daDataInfo.ogrn || '', // Сохраняем ОГРН
          organizationTypeId: defaultOrgType?.id || 1,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          phone: dto.phone,
          companyId: company.id,
          roleInCompanyId: 1, 
        },
      });

      return user;
    });

    // 2. Создаем юридический адрес, если данные получены
    if (daDataInfo.address && daDataInfo.address.data) {
        try {
            await this.addressesService.createLegalAddress(newUser.companyId, daDataInfo.address.data);
        } catch (e) {
            this.logger.error(`Failed to create address for company ${newUser.companyId}`, e);
            // Не роняем регистрацию, если адрес не создался, но логируем
        }
    }

    // Передаем companyId в генерацию токенов
    const tokens = await this.getTokens(newUser.id, newUser.email, newUser.companyId, newUser.roleInCompanyId);
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);

    return tokens;
  }

  // Вход (без изменений)
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your account has been banned');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.companyId, user.roleInCompanyId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.usersService.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await argon2.verify(user.refreshTokenHash, rt);
    if (!rtMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.companyId, user.roleInCompanyId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // --- Вспомогательные методы ---

  private async getTokens(userId: number, email: string, companyId: number, roleId: number) {
    const payload = { sub: userId, email, companyId, role: roleId };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        payload,
        { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        payload,
        { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '7d' },
      ),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }

  private async updateRefreshToken(userId: number, rt: string) {
    const hash = await argon2.hash(rt);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); 

    await this.usersService.update(userId, {
      refreshTokenHash: hash,
      refreshTokenExpiresAt: expiry,
    });
  }
}