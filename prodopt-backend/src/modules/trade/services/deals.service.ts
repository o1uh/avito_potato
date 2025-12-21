import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { NotificationsService } from '../../communication/services/notifications.service';
import { AddressesService } from '../../users/services/addresses.service'; 
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
    private readonly addressesService: AddressesService,
  ) {}

  async createFromOffer(dto: CreateDealFromOfferDto, buyerCompanyId: number) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: dto.offerId },
      include: { 
          purchaseRequest: true,
          items: true
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    
    if (offer.purchaseRequest.buyerCompanyId !== buyerCompanyId) {
      throw new ForbiddenException('Вы не являетесь автором запроса');
    }

    if (offer.offerStatusId !== 1) { 
        throw new BadRequestException('Это коммерческое предложение уже обработано');
    }

    if (!offer.items || offer.items.length === 0) {
        throw new BadRequestException('Оффер не содержит позиций товаров');
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
      const dealItemsData = offer.items.map(item => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
      }));

      // 3. Создаем сделку
      const newDeal = await tx.deal.create({
        data: {
          buyerCompanyId,
          supplierCompanyId: offer.supplierCompanyId,
          commercialOfferId: offer.id,
          totalAmount: offer.offerPrice,
          dealStatusId: DealStatus.CREATED,
          deliveryTerms: offer.deliveryConditions,
          items: {
              create: dealItemsData
          }
        },
      });

      // 4. Отправляем уведомления
      const supplierUsers = await this.prisma.user.findMany({
        where: { companyId: newDeal.supplierCompanyId, roleInCompanyId: { in: [1, 2] } }
      });

      for (const user of supplierUsers) {
        await this.notificationsService.send({
          userId: user.id,
          subject: 'Сделка согласована',
          message: `Покупатель принял ваше предложение. Сделка #${newDeal.id} создана. Ожидайте оплаты.`,
          type: 'SUCCESS',
          entityType: 'deal',
          entityId: newDeal.id
        });
      }

      return newDeal;
    });

    this.generateContract(deal.id).catch(e => this.logger.error(e));

    return deal;
  }

  async changeStatus(dealId: number, userId: number, companyId: number, newStatus: DealStatus, addressId?: number) {
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
        // Передаем addressId в метод acceptDeal
        return this.acceptDeal(deal, addressId);
      case DealStatus.PAID:
         break;
    }

    return this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: newStatus },
      include: { status: true } 
    });
  }

  private async acceptDeal(deal: Prisma.DealGetPayload<{}>, addressId?: number) {
    await this.escrowService.create({
      dealId: deal.id,
      totalAmount: Number(deal.totalAmount),
    });

    const updatedDeal = await this.prisma.deal.update({
      where: { id: deal.id },
      data: { 
          dealStatusId: DealStatus.AGREED,
          // Обновляем адрес доставки, если он передан
          deliveryAddressId: addressId || undefined
      },
      include: { status: true }
    });

    return updatedDeal;
  }

  private async generateContract(dealId: number) {
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

    const supplierAddress = await this.addressesService.getLegalAddressString(fullDeal.supplier.id);
    const buyerAddress = await this.addressesService.getLegalAddressString(fullDeal.buyer.id);

    const contractData = {
        number: `D-${fullDeal.id}/${new Date().getFullYear()}`,
        date: new Date().toLocaleDateString('ru-RU'),
        totalAmount: Number(fullDeal.totalAmount).toLocaleString('ru-RU'),
        supplier: { 
            name: fullDeal.supplier.name, 
            inn: fullDeal.supplier.inn, 
            address: supplierAddress, 
            director: 'Генеральный директор'
        }, 
        buyer: { 
            name: fullDeal.buyer.name, 
            inn: fullDeal.buyer.inn, 
            address: buyerAddress, 
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
    
    await this.documentsService.createDocument('contract', contractData, 1, 'deal', fullDeal.id);
  }

  async findById(id: number, companyId: number) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: { 
        buyer: true, 
        supplier: true, 
        escrowAccount: {
            include: { status: true }
        }, 
        transactions: true,
        status: true,
        
        // --- ДОБАВЛЕНО: Загрузка товаров и адреса ---
        items: true,
        deliveryAddress: true,
        // --------------------------------------------
      },
    });

    if (!deal) throw new NotFoundException();
    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException();
    }
    return deal;
  }

  async confirmDelivery(dealId: number, buyerCompanyId: number) {
    // ... (без изменений, метод confirmDelivery уже содержал items: true внутри)
    const deal = await this.prisma.deal.findUnique({ 
        where: { id: dealId },
        include: { 
            buyer: true, 
            supplier: true,
            items: true
        } 
    });
    
    if (!deal) throw new NotFoundException('Сделка не найдена');
    if (deal.buyerCompanyId !== buyerCompanyId) throw new ForbiddenException('Только покупатель может подтвердить приемку');
    if (deal.dealStatusId !== DealStatus.SHIPPED) throw new BadRequestException('Нельзя подтвердить приемку, если товар не был отгружен');

    await this.escrowService.release(dealId);

    const supplierAddress = await this.addressesService.getLegalAddressString(deal.supplier.id);
    const buyerAddress = await this.addressesService.getLegalAddressString(deal.buyer.id);

    const docData = {
        number: `ACT-${deal.id}`,
        date: new Date().toLocaleDateString('ru-RU'),
        totalAmount: Number(deal.totalAmount).toLocaleString('ru-RU'),
        supplier: { 
            name: deal.supplier.name, 
            inn: deal.supplier.inn, 
            address: supplierAddress 
        },
        buyer: { 
            name: deal.buyer.name, 
            inn: deal.buyer.inn, 
            address: buyerAddress 
        },
        items: deal.items.map((item, idx) => {
            const price = Number(item.pricePerUnit);
            const quantity = item.quantity;
            const totalSum = price * quantity; 
            const vat = totalSum * (20 / 120); 
            const net = totalSum - vat;

            return {
                index: idx + 1,
                name: item.productNameAtDealMoment,
                quantity: item.quantity,
                unit: item.measurementUnitAtDealMoment,
                price: price.toFixed(2),
                totalNet: net.toFixed(2),
                vatAmount: vat.toFixed(2),
                total: totalSum.toFixed(2)
            };
        })
    };

    try {
        await this.documentsService.createDocument('act', docData, 1, 'deal', deal.id);
    } catch (e) {
        this.logger.error(`Failed to generate closing documents for deal ${dealId}`, e);
    }

    const updatedDeal = await this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: DealStatus.COMPLETED },
      include: { status: true },
    });

    const supplierUsers = await this.prisma.user.findMany({
      where: { 
        companyId: deal.supplierCompanyId, 
        roleInCompanyId: { in: [1, 2] }    
      } 
    });

    for (const user of supplierUsers) {
      await this.notificationsService.send({
        userId: user.id,
        toEmail: user.email,
        subject: 'Сделка завершена',
        message: `Покупатель подтвердил приемку по сделке #${dealId}. Средства переведены на ваш счет.`,
        type: 'SUCCESS',
        entityType: 'deal',
        entityId: dealId
      });
    }

    return updatedDeal;
  }

  async findAll(companyId: number) {
    return this.prisma.deal.findMany({
      where: {
        OR: [
          { buyerCompanyId: companyId },
          { supplierCompanyId: companyId },
        ],
      },
      include: {
        buyer: true,
        supplier: true,
        status: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}