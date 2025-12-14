import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async sendRequest(initiatorCompanyId: number, recipientCompanyId: number, message: string) {
    if (initiatorCompanyId === recipientCompanyId) {
      throw new BadRequestException('Нельзя отправить запрос самому себе');
    }

    return this.prisma.cooperationRequest.create({
      data: {
        initiator_company_id: initiatorCompanyId,
        recipient_company_id: recipientCompanyId,
        message,
        request_status_id: 1, // Created/Pending
      },
    });
  }

  async getMyRequests(companyId: number) {
    return this.prisma.cooperationRequest.findMany({
      where: {
        OR: [
          { initiator_company_id: companyId },
          { recipient_company_id: companyId },
        ],
      },
      include: {
        initiatorCompany: { select: { id: true, name: true } },
        recipientCompany: { select: { id: true, name: true } },
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