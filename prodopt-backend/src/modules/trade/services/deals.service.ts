import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { NotificationsService } from '../../communication/services/notifications.service';
import { DealStateMachine, DealStatus } from '../utils/deal-state-machine';
import { Prisma } from '@prisma/client';
import { CreateDealFromOfferDto } from '../dto/trade.dto';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createFromOffer(dto: CreateDealFromOfferDto, buyerCompanyId: number) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: dto.offerId },
      include: { purchaseRequest: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    
    if (offer.purchaseRequest.buyerCompanyId !== buyerCompanyId) {
      throw new ForbiddenException('Вы не являетесь автором запроса');
    }

    if (offer.offerStatusId !== 1) { 
        throw new BadRequestException('Это коммерческое предложение уже обработано');
    }

    const deal = await this.prisma.$transaction(async (tx) => {
      // 1. Обновляем статус КП
      await tx.commercialOffer.update({
        where: { id: offer.id },
        data: { offerStatusId: 2 }, // Accepted
      });

      if (dto.closeRequest) {
          await tx.purchaseRequest.update({
              where: { id: offer.purchaseRequestId },
              data: { requestStatusId: 2 } 
          });
          await tx.commercialOffer.updateMany({
              where: {
                  purchaseRequestId: offer.purchaseRequestId,
                  id: { not: offer.id },
                  offerStatusId: 1 
              },
              data: { offerStatusId: 3 } 
          });
      }

      // 2. Подготовка товаров для сделки
      let dealItemsData: any[] = [];

      if (dto.items && dto.items.length > 0) {
          // Вариант А: Товары переданы явно в запросе
          dealItemsData = dto.items.map(item => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              // Для простоты делим общую сумму поровну или берем 0, 
              // цена за единицу пересчитается триггером БД, если передать null, 
              // но у нас общая сумма сделки фиксирована оффером.
              // Чтобы математика билась, в идеале нужно брать цену из варианта.
              // Передадим null, пусть триггер freeze_deal_item_price подтянет цену из каталога.
              pricePerUnit: null 
          }));
      } else {
          // Вариант Б (Fallback): Если items не передали, берем первый попавшийся товар поставщика,
          // чтобы сделка не была пустой (для PDF).
          const anyVariant = await tx.productVariant.findFirst({
              where: { product: { supplierCompanyId: offer.supplierCompanyId } }
          });
          
          if (anyVariant) {
              dealItemsData.push({
                  productVariantId: anyVariant.id,
                  quantity: 1,
                  pricePerUnit: offer.offerPrice // Присваиваем всю сумму одной позиции
              });
          }
      }

      // 3. Создаем сделку
      const newDeal = await tx.deal.create({
        data: {
          buyerCompanyId,
          supplierCompanyId: offer.supplierCompanyId,
          commercialOfferId: offer.id,
          totalAmount: offer.offerPrice,
          dealStatusId: DealStatus.CREATED,
          deliveryTerms: offer.deliveryConditions,
          items: dealItemsData.length > 0 ? {
              create: dealItemsData
          } : undefined
        },
      });

      return newDeal;
    });

    this.generateContract(deal.id).catch(e => this.logger.error(e));

    return deal;
  }

  async changeStatus(dealId: number, userId: number, companyId: number, newStatus: DealStatus) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException('Вы не участник сделки');
    }

    if (!DealStateMachine.canTransition(deal.dealStatusId, newStatus)) {
      throw new BadRequestException(`Недопустимый переход из ${deal.dealStatusId} в ${newStatus}`);
    }

    switch (newStatus) {
      case DealStatus.AGREED:
        return this.acceptDeal(deal);
      case DealStatus.PAID:
         break;
    }

    // ИСПРАВЛЕНО: Добавлен include для возврата статуса после обновления
    return this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: newStatus },
      include: { status: true } 
    });
  }

  private async acceptDeal(deal: Prisma.DealGetPayload<{}>) {
    await this.escrowService.create({
      dealId: deal.id,
      totalAmount: Number(deal.totalAmount),
    });

    // ИСПРАВЛЕНО: Добавлен include
    const updatedDeal = await this.prisma.deal.update({
      where: { id: deal.id },
      data: { dealStatusId: DealStatus.AGREED },
      include: { status: true }
    });

    return updatedDeal;
  }

  private async generateContract(dealId: number) {
    // 1. Запрашиваем полные данные по сделке
    const fullDeal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        include: { 
            buyer: true, 
            supplier: true,
            items: {
                include: { productVariant: true }
            }
        }
    });

    if (!fullDeal) return;

    // 2. Формируем данные для шаблона
    const contractData = {
        number: `D-${fullDeal.id}/${new Date().getFullYear()}`,
        date: new Date().toLocaleDateString('ru-RU'),
        totalAmount: Number(fullDeal.totalAmount).toLocaleString('ru-RU'),
        supplier: { 
            name: fullDeal.supplier.name, 
            inn: fullDeal.supplier.inn, 
            address: 'Юридический адрес не указан', // TODO: Подтянуть из таблицы Addresses через Relation
            director: 'Генеральный директор' // TODO: Подтянуть Signatory
        }, 
        buyer: { 
            name: fullDeal.buyer.name, 
            inn: fullDeal.buyer.inn, 
            address: 'Юридический адрес не указан',
            director: 'Генеральный директор'
        },
        items: fullDeal.items.map((item, index) => ({
            index: index + 1,
            name: item.productNameAtDealMoment,
            quantity: item.quantity,
            unit: item.measurementUnitAtDealMoment,
            price: Number(item.pricePerUnit).toFixed(2),
            total: (Number(item.pricePerUnit) * item.quantity).toFixed(2)
        }))
    };
    
    // 3. Генерируем
    await this.documentsService.createDocument('contract', contractData, 1, 'deal', fullDeal.id);
  }

  async findById(id: number, companyId: number) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      // ИСПРАВЛЕНО: Добавлен include: { status: true } для сделки
      // И include: { status: true } для эскроу счета
      include: { 
        buyer: true, 
        supplier: true, 
        escrowAccount: {
            include: { status: true }
        }, 
        transactions: true,
        status: true // <-- Название статуса сделки (Created, Agreed...)
      },
    });

    if (!deal) throw new NotFoundException();
    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException();
    }
    return deal;
  }

  async confirmDelivery(dealId: number, buyerCompanyId: number) {
    const deal = await this.prisma.deal.findUnique({ 
        where: { id: dealId },
        include: { 
            buyer: true, 
            supplier: true,
            items: true // Подгружаем товары для акта
        } 
    });
    
    if (!deal) throw new NotFoundException('Сделка не найдена');
    if (deal.buyerCompanyId !== buyerCompanyId) throw new ForbiddenException('Только покупатель может подтвердить приемку');
    if (deal.dealStatusId !== DealStatus.SHIPPED) throw new BadRequestException('Нельзя подтвердить приемку, если товар не был отгружен');

    await this.escrowService.release(dealId);

    // Подготовка реальных данных для Акта/УПД
    const docData = {
        number: `ACT-${deal.id}`,
        date: new Date().toLocaleDateString('ru-RU'),
        totalAmount: Number(deal.totalAmount).toLocaleString('ru-RU'),
        supplier: { 
            name: deal.supplier.name, 
            inn: deal.supplier.inn, 
            address: 'Адрес поставщика' 
        },
        buyer: { 
            name: deal.buyer.name, 
            inn: deal.buyer.inn, 
            address: 'Адрес покупателя' 
        },
        items: deal.items.map((item, idx) => ({
            index: idx + 1,
            name: item.productNameAtDealMoment,
            quantity: item.quantity,
            unit: item.measurementUnitAtDealMoment,
            price: Number(item.pricePerUnit).toFixed(2),
            totalNet: (Number(item.pricePerUnit) * item.quantity).toFixed(2), // Без НДС
            vatAmount: ((Number(item.pricePerUnit) * item.quantity) * 0.20).toFixed(2), // Пример НДС 20%
            total: ((Number(item.pricePerUnit) * item.quantity) * 1.20).toFixed(2) // Итого
        }))
    };

    try {
        await this.documentsService.createDocument('act', docData, 1, 'deal', deal.id);
    } catch (e) {
        this.logger.error(`Failed to generate closing documents for deal ${dealId}`, e);
    }

    return this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: DealStatus.COMPLETED },
      include: { status: true },
    });
  }
}