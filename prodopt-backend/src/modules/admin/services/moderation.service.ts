import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq'; // <--- Импорт
import { Queue } from 'bullmq';               // <--- Импорт

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    // --- ВНЕДРЕНИЕ ОЧЕРЕДИ ---
    @InjectQueue('catalog-sync') private syncQueue: Queue,
  ) {}

  async getPendingProducts() {
    return this.prisma.product.findMany({
      where: { productStatusId: 4 },
      include: { supplier: true, variants: true, images: true }, // Добавил images на всякий случай
    });
  }

  async approveProduct(productId: number, adminId: number) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { 
        productStatusId: 2, // Опубликован
        moderatorId: adminId 
      },
    });

    // --- СИНХРОНИЗАЦИЯ С ELASTIC ---
    await this.syncQueue.add('index-product', { productId });
    
    return product;
  }

  async rejectProduct(productId: number, adminId: number) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { 
        productStatusId: 1, // Черновик
        moderatorId: adminId 
      },
    });

    // --- УДАЛЕНИЕ ИЗ ИНДЕКСА (на всякий случай) ---
    await this.syncQueue.add('delete-product', { productId });

    return product;
  }
}