import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// 1. Импортируем сервис уведомлений
import { NotificationsService } from '../communication/services/notifications.service';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    // 2. Внедряем зависимость
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendRequest(initiatorCompanyId: number, recipientCompanyId: number, message: string) {
    if (initiatorCompanyId === recipientCompanyId) {
      throw new BadRequestException('Нельзя отправить запрос самому себе');
    }

    const existingRequest = await this.prisma.cooperationRequest.findFirst({
      where: {
        OR: [
          { initiator_company_id: initiatorCompanyId, recipient_company_id: recipientCompanyId },
          { initiator_company_id: recipientCompanyId, recipient_company_id: initiatorCompanyId }
        ]
      }
    });

    if (existingRequest) {
      if (existingRequest.request_status_id === 2) throw new BadRequestException('Вы уже являетесь партнерами');
      if (existingRequest.request_status_id === 1) throw new BadRequestException('Запрос на сотрудничество уже существует');
      throw new BadRequestException('История взаимодействия уже существует');
    }

    const request = await this.prisma.cooperationRequest.create({
      data: {
        initiator_company_id: initiatorCompanyId,
        recipient_company_id: recipientCompanyId,
        message,
        request_status_id: 1, // Pending
      },
      // Подгружаем инфо о компании-инициаторе, чтобы вставить имя в текст уведомления
      include: {
        initiatorCompany: true 
      }
    });

    // 3. Отправляем уведомления администраторам целевой компании
    const recipients = await this.prisma.user.findMany({
      where: { companyId: recipientCompanyId, roleInCompanyId: 1 } // 1 = Admin
    });

    for (const user of recipients) {
      await this.notificationsService.send({
        userId: user.id,
        toEmail: user.email,
        subject: 'Новый запрос на партнерство',
        message: `Компания "${request.initiatorCompany.name}" хочет стать вашим партнером.`,
        type: 'INFO',
        entityType: 'system', // или 'partner_request', если добавите такой тип
        entityId: request.id,
      });
    }

    return request;
  }

  // ... остальные методы (getMyRequests, approveRequest) без изменений
  async getMyRequests(companyId: number) {
    return this.prisma.cooperationRequest.findMany({
      where: {
        OR: [
          { initiator_company_id: companyId },
          { recipient_company_id: companyId },
        ],
      },
      include: {
        initiatorCompany: { select: { id: true, name: true, inn: true } },
        recipientCompany: { select: { id: true, name: true, inn: true } },
      },
    });
  }

  async approveRequest(requestId: number, recipientCompanyId: number) {
    const request = await this.prisma.cooperationRequest.findUnique({ 
        where: { id: requestId },
        include: { recipientCompany: true } // Подгружаем для уведомления
    });
    
    if (!request || request.recipient_company_id !== recipientCompanyId) {
      throw new BadRequestException('Запрос не найден или нет прав');
    }

    const updated = await this.prisma.cooperationRequest.update({
      where: { id: requestId },
      data: { request_status_id: 2 }, // Approved
    });

    // --- ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ИНИЦИАТОРУ О ТОМ, ЧТО ЕГО ПРИНЯЛИ ---
    const initiators = await this.prisma.user.findMany({
        where: { companyId: request.initiator_company_id, roleInCompanyId: 1 }
    });

    for (const user of initiators) {
        await this.notificationsService.send({
            userId: user.id,
            toEmail: user.email,
            subject: 'Партнерство подтверждено',
            message: `Компания "${request.recipientCompany.name}" приняла ваш запрос на партнерство.`,
            type: 'SUCCESS',
            entityType: 'system',
            entityId: request.id,
        });
    }
    // ------------------------------------------------------------------

    return updated;
  }
  
  // Добавьте метод rejectRequest если он нужен для API, хотя бы пустой или с ошибкой
  async rejectRequest(requestId: number) {
      throw new BadRequestException('Not implemented');
  }
}