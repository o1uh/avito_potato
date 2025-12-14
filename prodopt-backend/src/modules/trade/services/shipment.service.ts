import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddTrackingDto } from '../dto/shipment.dto';
import { DealStatus } from '../utils/deal-state-machine';

@Injectable()
export class ShipmentService {
  constructor(private readonly prisma: PrismaService) {}

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

      // Переводим сделку в статус SHIPPED
      await tx.deal.update({
        where: { id: deal.id },
        data: { dealStatusId: DealStatus.SHIPPED },
      });

      return shipment;
    });
  }
}