import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../../common/providers/email.service';
import { ChatGateway } from '../gateways/chat.gateway'; // <--- ИМПОРТ

export interface NotificationPayload {
  userId: number;
  toEmail?: string;
  subject: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  entityType?: string; // Поправил тип, чтобы TS не ругался на 'partner_request'
  entityId?: number;
  template?: string;
  context?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly chatGateway: ChatGateway, // <--- ВНЕДРЕНИЕ
  ) {}

  async send(payload: NotificationPayload) {
    try {
      // 1. Сохраняем в БД
      const notification = await this.prisma.notification.create({
        data: {
          recipientId: payload.userId,
          title: payload.subject,
          message: payload.message,
          type: payload.type || 'INFO',
          entityType: payload.entityType,
          entityId: payload.entityId,
          isRead: false,
        },
      });

      // 2. Отправляем в Socket (Real-time)
      // Важно: Gateway должен уметь отправлять конкретному юзеру.
      // Если в ChatGateway нет метода sendToUser, его надо добавить (см. ниже).
      this.chatGateway.sendNotificationToUser(payload.userId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId,
        createdAt: notification.createdAt,
      });

      // 3. Отправляем Email
      if (payload.toEmail && payload.template) {
        this.emailService.sendMail(
          payload.toEmail,
          payload.subject,
          payload.template,
          payload.context || { title: payload.subject, message: payload.message },
        ).catch(e => this.logger.error(`Email sending failed: ${e.message}`));
      }

    } catch (error) {
      this.logger.error(`Failed to send notification to User ${payload.userId}`, error);
    }
  }
}