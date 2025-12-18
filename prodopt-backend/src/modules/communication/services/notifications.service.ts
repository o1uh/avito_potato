import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../../common/providers/email.service';

export interface NotificationPayload {
  userId: number;           // ID получателя (обязательно для БД)
  toEmail?: string;         // Email (если нужно дублировать на почту)
  subject: string;          // Заголовок
  message: string;          // Текст сообщения
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  entityType?: 'deal' | 'offer' | 'dispute' | 'system';
  entityId?: number;
  template?: string;        // Имя шаблона Email
  context?: any;            // Данные для шаблона
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Универсальная отправка уведомления (DB + Email)
   */
  async send(payload: NotificationPayload) {
    try {
      // Сохраняем в БД (In-App Notification)
      await this.prisma.notification.create({
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

      // Отправляем Email (если указан адрес и шаблон)
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