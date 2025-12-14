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

    // Если оффер уже принят или отклонен — нельзя создать сделку (защита от дублей)
    if (offer.offerStatusId !== 1) { // 1 = Sent
        throw new BadRequestException('Это коммерческое предложение уже обработано (принято или отклонено)');
    }

    const deal = await this.prisma.$transaction(async (tx) => {
      // Помечаем текущее КП как принятое (Accepted = 2)
      await tx.commercialOffer.update({
        where: { id: offer.id },
        data: { offerStatusId: 2 }, 
      });

      // Если пользователь попросил закрыть заявку (галочка на фронте)
      if (dto.closeRequest) {
          // Закрываем саму заявку (Status 2 = Closed)
          await tx.purchaseRequest.update({
              where: { id: offer.purchaseRequestId },
              data: { requestStatusId: 2 } 
          });

          // Опционально: Отклоняем все остальные активные офферы по этой заявке
          await tx.commercialOffer.updateMany({
              where: {
                  purchaseRequestId: offer.purchaseRequestId,
                  id: { not: offer.id }, // Кроме текущего
                  offerStatusId: 1 // Только те, что в статусе "Sent"
              },
              data: { offerStatusId: 3 } // 3 = Rejected
          });
      }

      // Создаем сделку
      const newDeal = await tx.deal.create({
        data: {
          buyerCompanyId,
          supplierCompanyId: offer.supplierCompanyId,
          commercialOfferId: offer.id,
          totalAmount: offer.offerPrice,
          dealStatusId: DealStatus.CREATED,
          deliveryTerms: offer.deliveryConditions,
        },
      });

      return newDeal;
    });

    this.generateContract(deal).catch(e => this.logger.error(e));

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

  private async generateContract(deal: any) {
    const contractData = {
        number: `D-${deal.id}`,
        date: new Date().toLocaleDateString(),
        totalAmount: deal.totalAmount,
        supplier: { name: 'Supplier', inn: '...', address: '...' }, 
        buyer: { name: 'Buyer', inn: '...', address: '...' }
    };
    
    await this.documentsService.createDocument('contract', contractData, 1, 'deal', deal.id);
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
        include: { buyer: true, supplier: true } // Подгружаем данные для документов
    });
    
    if (!deal) throw new NotFoundException('Сделка не найдена');

    // 1. Проверка прав
    if (deal.buyerCompanyId !== buyerCompanyId) {
      throw new ForbiddenException('Только покупатель может подтвердить приемку');
    }

    // 2. Проверка статуса
    if (deal.dealStatusId !== DealStatus.SHIPPED) {
      throw new BadRequestException('Нельзя подтвердить приемку, если товар не был отгружен');
    }

    // 3. Выплата денег поставщику
    await this.escrowService.release(dealId);

    // 4. Генерация закрывающих документов (Акт выполненных работ / УПД)
    // Генерируем "Акт" (или УПД) от лица Поставщика для Покупателя
    const docData = {
        number: `ACT-${deal.id}`,
        date: new Date().toLocaleDateString(),
        totalAmount: Number(deal.totalAmount),
        supplier: { 
            name: deal.supplier.name, 
            inn: deal.supplier.inn, 
            address: 'Адрес поставщика' // В идеале брать из таблицы адресов
        },
        buyer: { 
            name: deal.buyer.name, 
            inn: deal.buyer.inn, 
            address: 'Адрес покупателя' 
        },
        items: [] // Можно подтянуть dealItems, если нужно детально
    };

    // Генерируем и сохраняем документ.
    // userId берем 1 (System) или можно передать ID текущего юзера в метод
    try {
        await this.documentsService.createDocument('act', docData, 1, 'deal', deal.id);
    } catch (e) {
        this.logger.error(`Failed to generate closing documents for deal ${dealId}`, e);
        // Не роняем транзакцию, если документ не сгенерировался, но логируем ошибку
    }

    // 5. Обновление статуса
    return this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: DealStatus.COMPLETED },
      include: { status: true },
    });
  }
}