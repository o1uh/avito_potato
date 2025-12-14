import { Injectable, Logger } from '@nestjs/common';
import { IDeliveryProvider, TrackingResult } from './delivery-provider.interface';

@Injectable()
export class CdekAdapter implements IDeliveryProvider {
  private readonly logger = new Logger(CdekAdapter.name);

  async getTrackingStatus(trackingNumber: string): Promise<TrackingResult> {
    this.logger.log(`Requesting CDEK status for ${trackingNumber}`);

    // TODO: Здесь должна быть реальная интеграция через HttpService с API СДЭК
    // Для разработки используем Mock-логику:

    if (trackingNumber.startsWith('TEST-DELIVERED')) {
      return {
        status: 'DELIVERED',
        location: 'Москва, Склад выдачи',
        updatedAt: new Date(),
      };
    }

    return {
      status: 'IN_TRANSIT',
      location: 'Сортировочный центр',
      updatedAt: new Date(),
    };
  }
}