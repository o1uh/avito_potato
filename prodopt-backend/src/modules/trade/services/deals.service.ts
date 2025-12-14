import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { NotificationsService } from '../../communication/services/notifications.service';
import { DealStateMachine, DealStatus } from '../utils/deal-state-machine';
import { Prisma } from '@prisma/client';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // 1. Создание сделки на основе принятого Оффера
  async createFromOffer(offerId: number, buyerCompanyId: number) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { purchaseRequest: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    
    // Проверка: принимает ли сделку тот, кто создавал запрос
    if (offer.purchaseRequest.buyerCompanyId !== buyerCompanyId) {
      throw new ForbiddenException('Вы не являетесь автором запроса');
    }

    // Создаем сделку в транзакции (чтобы сразу сгенерировать договор и сменить статус оффера)
    const deal = await this.prisma.$transaction(async (tx) => {
      // Обновляем статус оффера
      await tx.commercialOffer.update({
        where: { id: offer.id },
        data: { offerStatusId: 2 }, // Accepted
      });

      // Создаем сделку
      const newDeal = await tx.deal.create({
        data: {
          buyerCompanyId,
          supplierCompanyId: offer.supplierCompanyId,
          commercialOfferId: offer.id,
          totalAmount: offer.offerPrice,
          dealStatusId: DealStatus.CREATED,
          deliveryTerms: offer.deliveryConditions,
          // В реальном кейсе здесь нужно копировать товары в DealItems из OfferItems
          // Для MVP считаем, что сумма общая
        },
      });

      return newDeal;
    });

    // Асинхронно генерируем черновик договора
    // userId берем условно 0 или системный, так как это автоматическое действие
    this.generateContract(deal).catch(e => this.logger.error(e));

    return deal;
  }

  // 2. Переход по статусам (State Machine)
  async changeStatus(dealId: number, userId: number, companyId: number, newStatus: DealStatus) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    // Проверка прав (участник сделки)
    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException('Вы не участник сделки');
    }

    // Проверка переходов
    if (!DealStateMachine.canTransition(deal.dealStatusId, newStatus)) {
      throw new BadRequestException(`Недопустимый переход из ${deal.dealStatusId} в ${newStatus}`);
    }

    // Логика переходов
    switch (newStatus) {
      case DealStatus.AGREED:
        return this.acceptDeal(deal);
      
      // Статус PAID выставляется только системой через вебхук банка (или Dev-endpoint)
      case DealStatus.PAID:
         // Здесь должна быть проверка, что вызов идет от FinanceService или Admin
         // Для упрощения разрешаем, если вызывающий - internal system
         break;
    }

    return this.prisma.deal.update({
      where: { id: dealId },
      data: { dealStatusId: newStatus },
    });
  }

  // Логика принятия условий (AGREED)
  private async acceptDeal(deal: Prisma.DealGetPayload<{}>) {
    // 1. Создаем Эскроу счет
    // Важно: передаем prisma transaction client, если бы метод был внутри транзакции. 
    // EscrowService.create сам по себе атомарен.
    await this.escrowService.create({
      dealId: deal.id,
      totalAmount: Number(deal.totalAmount),
    });

    // 2. Обновляем статус
    const updatedDeal = await this.prisma.deal.update({
      where: { id: deal.id },
      data: { dealStatusId: DealStatus.AGREED },
    });

    // 3. Генерируем счет на оплату
    // this.generateInvoice(updatedDeal);

    return updatedDeal;
  }

  private async generateContract(deal: any) {
    // Используем DocumentsService
    // userId - заглушка, т.к. системное действие
    const contractData = {
        number: `D-${deal.id}`,
        date: new Date().toLocaleDateString(),
        totalAmount: deal.totalAmount,
        supplier: { name: 'Supplier', inn: '...', address: '...' }, // Нужно подтянуть из БД
        buyer: { name: 'Buyer', inn: '...', address: '...' }
    };
    
    await this.documentsService.createDocument('contract', contractData, 1, 'deal', deal.id);
  }

  async findById(id: number, companyId: number) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: { buyer: true, supplier: true, escrowAccount: true, transactions: true },
    });

    if (!deal) throw new NotFoundException();
    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException();
    }
    return deal;
  }
}