import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../services/notifications.service'; // <--- Импорт сервиса

@ApiTags('Communication: Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService, // <--- Внедрение сервиса
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить список моих уведомлений' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyNotifications(
    @CurrentUser('sub') userId: number,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const whereCondition: any = { recipientId: userId };
    if (unreadOnly === 'true') {
      whereCondition.isRead = false;
    }

    const take = limit ? parseInt(limit) : 50;

    const [items, count] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: take,
      }),
      this.prisma.notification.count({ where: { recipientId: userId, isRead: false } })
    ]);

    return { 
      data: items, 
      meta: { unreadCount: count } 
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Пометить уведомление как прочитанное' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: number,
  ) {
    await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Пометить все как прочитанные' })
  async markAllAsRead(@CurrentUser('sub') userId: number) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // --- НОВЫЙ ЭНДПОИНТ ДЛЯ ТЕСТА ---
  @Post('test-send')
  @ApiOperation({ summary: '[DEV] Отправить себе тестовое уведомление' })
  async sendTestNotification(@CurrentUser('sub') userId: number) {
    await this.notificationsService.send({
        userId: userId,
        subject: 'Проверка связи (Real-time)',
        message: `Это реальное уведомление с сервера. Время: ${new Date().toLocaleTimeString()}`,
        type: 'SUCCESS',
        entityType: 'system',
    });
    return { success: true };
  }
}