import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { DealStatus } from '../../trade/utils/deal-state-machine';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
  ) {}

  async openDispute(dealId: number, userId: number, companyId: number, reason: string, demands: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    // Проверка: спор может открыть только участник сделки
    if (deal.buyerCompanyId !== companyId && deal.supplierCompanyId !== companyId) {
      throw new ForbiddenException('Вы не являетесь участником этой сделки');
    }

    // Проверка статуса: Спор можно открыть, если деньги уже там (PAID) или товар в пути (SHIPPED)
    if (deal.dealStatusId !== DealStatus.PAID && deal.dealStatusId !== DealStatus.SHIPPED) {
      throw new BadRequestException('Невозможно открыть спор на данном этапе сделки');
    }

    // Транзакция: Создаем спор и меняем статус сделки
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          dealId,
          disputeReason: reason,
          claimantDemands: demands,
          claimantCompanyId: companyId,
          defendantCompanyId: companyId === deal.buyerCompanyId ? deal.supplierCompanyId : deal.buyerCompanyId,
          disputeStatusId: 1, // Open
        },
      });

      await tx.deal.update({
        where: { id: dealId },
        data: { dealStatusId: DealStatus.DISPUTE }, // 7
      });

      return dispute;
    });
  }

  // Метод для арбитра (Администратора)
  async resolveDispute(disputeId: number, decision: string, refundAmount: number, winnerCompanyId: number) {
    const dispute = await this.prisma.dispute.findUnique({ 
      where: { id: disputeId },
      include: { deal: true }
    });
    if (!dispute) throw new NotFoundException('Спор не найден');

    if (dispute.disputeStatusId !== 1) throw new BadRequestException('Спор уже закрыт');

    // Решаем судьбу денег
    if (refundAmount > 0) {
      // Возврат покупателю
      await this.escrowService.refund(dispute.dealId, refundAmount);
    } 
    
    const remainingBalance = await this.escrowService.getBalance(dispute.dealId);
    const amountToRelease = Number(remainingBalance.amountDeposited);

    if (amountToRelease > 0) {
      // Остаток продавцу
      await this.escrowService.release(dispute.dealId);
    }

    // Обновляем спор и сделку
    return this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          finalDecision: decision,
          refundAmount: refundAmount,
          disputeStatusId: 2, // Closed
          closedAt: new Date(),
        },
      });

      // Переводим сделку в конечный статус
      // Если полный возврат -> CANCELED (6), иначе COMPLETED (5)
      const newStatus = Number(dispute.deal.totalAmount) === refundAmount ? DealStatus.CANCELED : DealStatus.COMPLETED;
      
      await tx.deal.update({
        where: { id: dispute.dealId },
        data: { dealStatusId: newStatus },
      });
    });
  }

    async findAllOpen() {
    return this.prisma.dispute.findMany({
      where: { 
        disputeStatusId: 1 // 1 = Open
      },
      include: {
        claimant: { select: { id: true, name: true, inn: true } },
        defendant: { select: { id: true, name: true, inn: true } },
        deal: { select: { id: true, totalAmount: true } }
      },
      orderBy: { openedAt: 'desc' }
    });
  }
}