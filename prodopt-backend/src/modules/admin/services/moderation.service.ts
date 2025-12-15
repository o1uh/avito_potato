import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingProducts() {
    // productStatusId = 4 (На модерации) - см. seed.ts
    return this.prisma.product.findMany({
      where: { productStatusId: 4 },
      include: { supplier: true, variants: true },
    });
  }

  async approveProduct(productId: number, adminId: number) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { 
        productStatusId: 2, // Опубликован
        moderatorId: adminId 
      },
    });
  }

  async rejectProduct(productId: number, adminId: number) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { 
        productStatusId: 1, // Возврат в черновик
        moderatorId: adminId 
      },
    });
  }
}