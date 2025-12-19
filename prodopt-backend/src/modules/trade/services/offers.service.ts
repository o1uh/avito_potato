import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
        items: {
            create: dto.items.map(item => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit
            }))
        }
      },
      include: { items: true } // Возвращаем созданные items
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

  async findAll(companyId: number, type: 'sent' | 'received') {
    if (type === 'sent') {
      // Исходящие: где я поставщик
      return this.prisma.commercialOffer.findMany({
        where: { supplierCompanyId: companyId },
        include: {
          purchaseRequest: {
            include: { buyer: { select: { id: true, name: true,} } } // Чтобы видеть, кому отправили
          },
          status: true,
          items: { include: { productVariant: { include: { product: true } } } }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'received') {
      // Входящие: где я автор запроса (покупатель)
      return this.prisma.commercialOffer.findMany({
        where: {
          purchaseRequest: {
            buyerCompanyId: companyId, // Связь через запрос
          },
        },
        include: {
          supplier: { select: { id: true, name: true, rating: true } }, // Чтобы видеть, кто прислал
          purchaseRequest: true, // Контекст запроса
          status: true,
          items: { include: { productVariant: { include: { product: true } } } }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      throw new BadRequestException('Неверный параметр type. Используйте sent или received');
    }
  }
}