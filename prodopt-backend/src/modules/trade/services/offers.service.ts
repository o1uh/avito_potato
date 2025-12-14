import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOfferDto, NegotiateOfferDto } from '../dto/trade.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(supplierCompanyId: number, dto: CreateOfferDto) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) throw new NotFoundException('RFQ не найден');

    // Если запрос приватный, проверяем адресата
    if (request.supplierCompanyId && request.supplierCompanyId !== supplierCompanyId) {
      throw new ForbiddenException('Этот запрос адресован другой компании');
    }

    return this.prisma.commercialOffer.create({
      data: {
        purchaseRequestId: dto.requestId,
        supplierCompanyId,
        offerPrice: dto.offerPrice,
        deliveryConditions: dto.deliveryConditions,
        expiresOn: new Date(dto.expiresOn),
        offerStatusId: 1, // Sent
      },
    });
  }

  async negotiate(offerId: number, companyId: number, dto: NegotiateOfferDto) {
    const offer = await this.prisma.commercialOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('КП не найдено');

    // Проверка прав (менять может только автор-поставщик)
    if (offer.supplierCompanyId !== companyId) {
      throw new ForbiddenException('Только поставщик может менять условия КП');
    }

    // История изменений (версионность) в MVP можно опустить, просто обновляем
    return this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: {
        offerPrice: dto.offerPrice,
        deliveryConditions: dto.deliveryConditions,
      },
    });
  }
}