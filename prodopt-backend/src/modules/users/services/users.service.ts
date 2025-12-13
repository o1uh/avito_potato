import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid'; // Для генерации временного пароля

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // --- Существующие методы ---
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  // --- Новые методы для команды ---

  // Получить всех сотрудников компании
  async findAllByCompany(companyId: number) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleInCompanyId: true,
        position: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // Пригласить сотрудника (Создать пользователя)
  async inviteMember(adminCompanyId: number, email: string, fullName: string, roleId: number) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    // Генерируем временный пароль
    const tempPassword = uuidv4().slice(0, 8);
    const passwordHash = await argon2.hash(tempPassword);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        companyId: adminCompanyId,
        roleInCompanyId: roleId,
        isActive: true,
      },
    });

    // TODO: В реальном проекте здесь нужно отправить Email с tempPassword через EmailService
    // Пока возвращаем пароль в ответе для удобства тестирования
    return { ...newUser, tempPassword };
  }

  // Удалить сотрудника (или деактивировать)
  async removeMember(requesterId: number, requesterCompanyId: number, targetUserId: number) {
    if (requesterId === targetUserId) {
      throw new BadRequestException('Нельзя удалить самого себя');
    }

    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (targetUser.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Пользователь принадлежит другой компании');
    }

    // Удаляем (или можно делать isActive: false)
    return this.prisma.user.delete({
      where: { id: targetUserId },
    });
  }

  // Сменить роль
  async changeRole(requesterCompanyId: number, targetUserId: number, newRoleId: number) {
    const targetUser = await this.findById(targetUserId);
    
    if (!targetUser || targetUser.companyId !== requesterCompanyId) {
      throw new ForbiddenException('Пользователь не найден в вашей компании');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { roleInCompanyId: newRoleId },
    });
  }
}