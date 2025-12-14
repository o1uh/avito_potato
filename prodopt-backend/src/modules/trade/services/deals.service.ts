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

  async createFromOffer(offerId: number, buyerCompanyId: number) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { purchaseRequest: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    
    if (offer.purchaseRequest.buyerCompanyId !== buyerCompanyId) {
      throw new ForbiddenException('Вы не являетесь автором запроса');
    }

    const deal = await this.prisma.$transaction(async (tx) => {
      await tx.commercialOffer.update({
        where: { id: offer.id },
        data: { offerStatusId: 2 }, // Accepted
      });

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
}