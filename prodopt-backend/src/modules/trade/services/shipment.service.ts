import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddTrackingDto } from '../dto/shipment.dto';
import { DealStatus } from '../utils/deal-state-machine';
import { NotificationsService } from '../../communication/services/notifications.service';

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
) {}

  async addTracking(dealId: number, supplierId: number, dto: AddTrackingDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) throw new NotFoundException('Сделка не найдена');

    // 1. Проверка прав (только Поставщик)
    if (deal.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Только поставщик может добавить трек-номер');
    }

    // 2. Проверка статуса (Должна быть оплачена - PAID)
    if (deal.dealStatusId !== DealStatus.PAID) {
      throw new BadRequestException('Нельзя отгрузить товар, пока сделка не оплачена');
    }

    // 3. Сохранение и обновление статуса
    return this.prisma.$transaction(async (tx) => {
      // Создаем запись об отгрузке
      const shipment = await tx.shipment.create({
        data: {
          dealId: deal.id,              
          trackingNumber: dto.trackingNumber, 
          logisticsService: dto.carrier || 'CDEK', 
          deliveryStatusId: 1, // 1 = In Transit
          sentAt: new Date(),
        },
      });
      const buyerUsers = await this.prisma.user.findMany({
        where: { companyId: deal.buyerCompanyId, roleInCompanyId: { in: [1, 2] } }
      });

      for (const user of buyerUsers) {
        await this.notificationsService.send({
          userId: user.id,
          subject: 'Товар отгружен',
          message: `Поставщик добавил трек-номер по сделке #${dealId}. Груз в пути.`,
          type: 'INFO',
          entityType: 'deal',
          entityId: dealId
        });
      }
      // Переводим сделку в статус SHIPPED
      await tx.deal.update({
        where: { id: deal.id },
        data: { dealStatusId: DealStatus.SHIPPED },
      });

      return shipment;
    });
  }
}