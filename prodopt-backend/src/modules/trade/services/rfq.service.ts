import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../communication/services/notifications.service';
import { CreateRfqDto } from '../dto/trade.dto';

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(buyerCompanyId: number, dto: CreateRfqDto) {
    // 1. Создаем запрос
    const rfq = await this.prisma.purchaseRequest.create({
      data: {
        comment: dto.comment,
        buyerCompanyId,
        supplierCompanyId: dto.supplierCompanyId, // Может быть null
        requestStatusId: 1, 
        productVariantId: dto.productVariantId,
        requestedQuantity: dto.quantity,
      },
      include: { buyer: true },
    });

    // 2. Уведомление
    if (dto.supplierCompanyId) {
      // Ищем email сотрудников поставщика (упрощенно - всем админам компании)
      const suppliers = await this.prisma.user.findMany({
        where: { companyId: dto.supplierCompanyId, roleInCompanyId: 1 },
      });

      for (const supplier of suppliers) {
        await this.notificationsService.send({
          userId: supplier.id,
          toEmail: supplier.email,
          subject: 'Новый запрос на закупку',
          message: `Компания ${rfq.buyer.name} разместила новый запрос`, // Текст для UI
          template: 'notification',
          context: {
            title: 'Вам поступил новый RFQ',
            message: `Компания ${rfq.buyer.name} хочет купить товары.`,
          },
          entityType: 'offer', // или 'rfq'
          entityId: rfq.id
        });
      }
    }

    return rfq;
  }

  async findAll(companyId: number) {
    return this.prisma.purchaseRequest.findMany({
      where: {
        OR: [
          { buyerCompanyId: companyId },
          { supplierCompanyId: companyId },
          { supplierCompanyId: null }, // Публичные запросы
        ],
      },
      include: { 
          buyer: true, 
          supplier: true,
          targetVariant: {
              include: { product: true, measurementUnit: true }
          }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}