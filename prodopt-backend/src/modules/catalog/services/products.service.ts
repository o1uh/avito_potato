import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateProductDto, UpdateProductDto } from '../dto/catalog.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('catalog-sync') private syncQueue: Queue,
  ) {}

  async create(supplierId: number, dto: CreateProductDto) {
    // Создаем товар и варианты в одной транзакции
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        supplierCompanyId: supplierId,
        productCategoryId: dto.productCategoryId,
        productStatusId: 1, // По умолчанию Черновик или На модерации (зависит от seed, пусть 2 - Опубликован для теста)
        variants: {
          create: dto.variants.map((v) => ({
            variantName: v.variantName,
            sku: v.sku,
            price: v.price,
            minOrderQuantity: v.minOrderQuantity,
            measurementUnitId: v.measurementUnitId,
          })),
        },
      },
      include: { variants: true },
    });

    // Отправляем в очередь на индексацию
    await this.syncQueue.add('index-product', { productId: product.id });

    return product;
  }

  async update(id: number, supplierId: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Вы можете редактировать только свои товары');
    }

    // Обновляем базовую инфу
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        productCategoryId: dto.productCategoryId,
      },
      include: { variants: true },
    });

    // Примечание: Полное обновление вариантов (удаление старых/создание новых) - сложнее,
    // здесь для простоты обновляем триггер индексации. В реальном проекте нужна логика merge вариантов.
    
    await this.syncQueue.add('index-product', { productId: updatedProduct.id });

    return updatedProduct;
  }

  async delete(id: number, supplierId: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Вы можете удалять только свои товары');
    }

    await this.prisma.product.delete({ where: { id } });

    // Удаляем из индекса
    await this.syncQueue.add('delete-product', { productId: id });

    return { message: 'Товар удален' };
  }

  async getMyProducts(supplierId: number) {
    return this.prisma.product.findMany({
      where: { supplierCompanyId: supplierId },
      include: { variants: true, status: true, category: true },
    });
  }
}