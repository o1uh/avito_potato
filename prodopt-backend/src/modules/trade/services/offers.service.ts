import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOfferDto, NegotiateOfferDto } from '../dto/trade.dto';
import { NotificationsService } from '../../communication/services/notifications.service';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}
  
  async create(supplierCompanyId: number, dto: CreateOfferDto) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) throw new NotFoundException('RFQ не найден');

    // Если запрос приватный, проверяем адресата
    if (request.supplierCompanyId && request.supplierCompanyId !== supplierCompanyId) {
      throw new ForbiddenException('Этот запрос адресован другой компании');
    }

    const savedOffer = await this.prisma.commercialOffer.create({
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

    const buyerUsers = await this.prisma.user.findMany({
      where: { companyId: request.buyerCompanyId, roleInCompanyId: { in: [1, 2] } }
    });

    for (const user of buyerUsers) {
      await this.notificationsService.send({
        userId: user.id,
        subject: 'Получено новое коммерческое предложение',
        message: `Поступило предложение по запросу #${dto.requestId}`,
        type: 'INFO',
        entityType: 'offer', // Используем deal для перехода, или null
        entityId: savedOffer.id // Или ID запроса
      });
    }

    return savedOffer;
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
            include: { 
                buyer: { select: { id: true, name: true } },
                targetVariant: { 
                    include: { product: true } 
                }
            } 
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
            buyerCompanyId: companyId,
          },
        },
        include: {
          supplier: { select: { id: true, name: true, rating: true } },
          
          // --- БЫЛО: ---
          // purchaseRequest: true, 

          // --- СТАЛО (ИСПРАВЛЕНИЕ): ---
          purchaseRequest: {
            include: {
                targetVariant: {
                    include: { product: true }
                }
            }
          },
          // ---------------------------

          status: true,
          items: { include: { productVariant: { include: { product: true } } } }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      throw new BadRequestException('Неверный параметр type. Используйте sent или received');
    }
    
  }
  async reject(offerId: number, companyId: number) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { purchaseRequest: true }
    });

    if (!offer) throw new NotFoundException('КП не найдено');

    // Отклонить может только автор запроса (покупатель)
    if (offer.purchaseRequest.buyerCompanyId !== companyId) {
      throw new ForbiddenException('Вы не можете отклонить это предложение');
    }

    // Обновляем статус на 3 (Rejected)
    const updatedOffer = await this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: { offerStatusId: 3 },
    });

    // Уведомляем поставщика
    const supplierUsers = await this.prisma.user.findMany({
      where: { companyId: offer.supplierCompanyId, roleInCompanyId: { in: [1, 2] } }
    });

    for (const user of supplierUsers) {
      await this.notificationsService.send({
        userId: user.id,
        subject: 'КП отклонено',
        message: `Ваше предложение по запросу #${offer.purchaseRequestId} отклонено покупателем.`,
        type: 'WARNING',
        entityType: 'offer',
        entityId: offer.id // Это направит на страницу офферов
      });
    }

    return updatedOffer;
  }
  
}