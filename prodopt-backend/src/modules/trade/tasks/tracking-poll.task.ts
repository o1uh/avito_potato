import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { CdekAdapter } from '../adapters/cdek.adapter';
import { NotificationsService } from '../../communication/services/notifications.service';

@Injectable()
export class TrackingPollTask {
  private readonly logger = new Logger(TrackingPollTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryProvider: CdekAdapter,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Запуск каждый час
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting tracking poll...');

    // 1. Ищем активные отгрузки, где сделка еще в пути (SHIPPED)
    // delivery_status_id = 1 (In Transit) - предположим из сида
    const shipments = await this.prisma.shipment.findMany({
      where: {
        delivery_status_id: 1, 
        deal: { dealStatusId: 4 }, // 4 = SHIPPED
      },
      include: { deal: { include: { buyer: true } } },
    });

    for (const shipment of shipments) {
      try {
        const result = await this.deliveryProvider.getTrackingStatus(shipment.tracking_number);

        if (result.status === 'DELIVERED') {
          // Обновляем статус доставки в БД
          await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { 
              delivery_status_id: 2, // 2 = Delivered (нужен сид)
              expected_delivery_date: result.updatedAt 
            },
          });

          // Уведомляем покупателя
          // Находим User'ов покупателя (упрощенно всех админов)
          const users = await this.prisma.user.findMany({
            where: { companyId: shipment.deal.buyerCompanyId, roleInCompanyId: 1 },
          });

          for (const user of users) {
            await this.notificationsService.send('email', {
              to: user.email,
              subject: 'Ваш заказ доставлен',
              template: 'notification',
              context: {
                title: 'Груз прибыл',
                message: `Заказ по сделке #${shipment.deal.id} доставлен. Пожалуйста, подтвердите приемку в личном кабинете.`,
              },
            });
          }
          
          this.logger.log(`Shipment ${shipment.id} delivered.`);
        }
      } catch (error) {
        this.logger.error(`Error polling shipment ${shipment.id}: ${error.message}`);
      }
    }
  }
}