import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DealStatus } from '../../trade/utils/deal-state-machine';

@Injectable()
export class CompanyReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(authorCompanyId: number, dealId: number, rating: number, comment: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    // Проверка: сделка должна быть завершена
    if (deal.dealStatusId !== DealStatus.COMPLETED) {
      throw new BadRequestException('Отзыв можно оставить только по завершенной сделке');
    }

    // Определяем получателя (отзыв пишет либо покупатель поставщику, либо наоборот)
    let recipientId: number;
    if (deal.buyerCompanyId === authorCompanyId) {
      recipientId = deal.supplierCompanyId;
    } else if (deal.supplierCompanyId === authorCompanyId) {
      recipientId = deal.buyerCompanyId;
    } else {
      throw new BadRequestException('Вы не участник этой сделки');
    }

    // Проверка на дубликат
    const existing = await this.prisma.companyReview.findFirst({
      where: { dealId, authorCompanyId },
    });
    if (existing) throw new BadRequestException('Вы уже оставили отзыв по этой сделке');

    const review = await this.prisma.companyReview.create({
      data: {
        dealId,
        authorCompanyId,
        recipientCompanyId: recipientId,
        serviceRating: rating,
        serviceComment: comment,
        reviewStatusId: 2, // Сразу публикуем для упрощения (или 1 - на модерацию)
      },
    });

    // Рейтинг пересчитается триггером БД (trigger_recalc_rating), который мы добавили в миграцию
    return review;
  }
}