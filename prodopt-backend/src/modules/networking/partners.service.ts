import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async sendRequest(initiatorCompanyId: number, recipientCompanyId: number, message: string) {
    if (initiatorCompanyId === recipientCompanyId) {
      throw new BadRequestException('Нельзя отправить запрос самому себе');
    }

    // --- ДОБАВЛЕНО: Проверка на существование связи ---
    const existingRequest = await this.prisma.cooperationRequest.findFirst({
      where: {
        OR: [
          // Проверяем прямую связь (Я -> Он)
          { 
            initiator_company_id: initiatorCompanyId, 
            recipient_company_id: recipientCompanyId 
          },
          // Проверяем обратную связь (Он -> Я), чтобы не создавать дубли
          { 
            initiator_company_id: recipientCompanyId, 
            recipient_company_id: initiatorCompanyId 
          }
        ]
      }
    });

    if (existingRequest) {
      // Если запрос уже одобрен
      if (existingRequest.request_status_id === 2) {
        throw new BadRequestException('Вы уже являетесь партнерами');
      }
      // Если запрос висит (статус 1)
      if (existingRequest.request_status_id === 1) {
        throw new BadRequestException('Запрос на сотрудничество уже существует');
      }
      // Если отклонен (статус 3) — можно разрешить повторную отправку, 
      // но лучше сначала удалить старый или обновить его. 
      // Для простоты пока запретим, если есть любая запись.
      throw new BadRequestException('История взаимодействия уже существует');
    }
    // --------------------------------------------------

    return this.prisma.cooperationRequest.create({
      data: {
        initiator_company_id: initiatorCompanyId,
        recipient_company_id: recipientCompanyId,
        message,
        request_status_id: 1, // Created/Pending
      },
    });
  }

  // Остальные методы без изменений...
  async getMyRequests(companyId: number) {
    return this.prisma.cooperationRequest.findMany({
      where: {
        OR: [
          { initiator_company_id: companyId },
          { recipient_company_id: companyId },
        ],
      },
      include: {
        initiatorCompany: { select: { id: true, name: true, inn: true } }, // Добавил inn
        recipientCompany: { select: { id: true, name: true, inn: true } }, // Добавил inn
      },
    });
  }

  async approveRequest(requestId: number, recipientCompanyId: number) {
    const request = await this.prisma.cooperationRequest.findUnique({ where: { id: requestId } });
    if (!request || request.recipient_company_id !== recipientCompanyId) {
      throw new BadRequestException('Запрос не найден или нет прав');
    }

    return this.prisma.cooperationRequest.update({
      where: { id: requestId },
      data: { request_status_id: 2 }, // Approved
    });
  }
}