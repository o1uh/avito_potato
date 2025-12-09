import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Регистрация: Создает Компанию и первого Пользователя в транзакции
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

    const passwordHash = await argon2.hash(dto.password);

    // Используем транзакцию, чтобы создать и компанию, и юзера атомарно
    const newUser = await this.prisma.$transaction(async (tx) => {
      // 1. Создаем компанию
      // Для упрощения, берем первый попавшийся тип организации, если не передан (в ТЗ нет ввода типа орг на регистрации)
      // В реальности нужно брать из DTO или парсить название
      const defaultOrgType = await tx.organizationType.findFirst();
      
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          inn: dto.inn,
          ogrn: '', // ОГРН обязателен в схеме, но в DTO его нет. Временно ставим заглушку или меняем схему. 
                    // Лучше добавим заглушку, чтобы не ломать DTO из ТЗ.
          organizationTypeId: defaultOrgType?.id || 1,
        },
      });

      // 2. Создаем пользователя
      const user = await tx.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          phone: dto.phone,
          companyId: company.id,
          roleInCompanyId: 1, // Заглушка, нужно брать из справочника ролей
        },
      });

      return user;
    });

    const tokens = await this.getTokens(newUser.id, newUser.email);
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);

    return tokens;
  }

  // Вход в систему
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // Выход (удаление хеша токена)
  async logout(userId: number) {
    await this.usersService.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  // Обновление токенов
  async refreshTokens(userId: number, rt: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await argon2.verify(user.refreshTokenHash, rt);
    if (!rtMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // --- Вспомогательные методы ---

  private async getTokens(userId: number, email: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
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
    expiry.setDate(expiry.getDate() + 7); // 7 дней жизни

    await this.usersService.update(userId, {
      refreshTokenHash: hash,
      refreshTokenExpiresAt: expiry,
    });
  }
}