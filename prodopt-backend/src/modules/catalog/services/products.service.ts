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
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        supplierCompanyId: supplierId,
        productCategoryId: dto.productCategoryId,
        productStatusId: 1, 
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

    await this.syncQueue.add('index-product', { productId: product.id });
    return product;
  }

  // --- ОБНОВЛЕННЫЙ МЕТОД UPDATE ---
  async update(id: number, supplierId: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Вы можете редактировать только свои товары');
    }

    // Выполняем в транзакции: обновление инфо + перезапись вариантов
    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      // 1. Обновляем основные поля
      const p = await tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          productCategoryId: dto.productCategoryId,
        },
      });

      // 2. Удаляем старые варианты (Стратегия: полная замена списка вариантов)
      // В будущем, если будут сделки, ссылающиеся на варианты, нужно будет делать soft delete или умный upsert.
      // Но для MVP полная замена допустима, пока нет активных сделок.
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      // 3. Создаем новые варианты
      await tx.productVariant.createMany({
        data: dto.variants.map((v) => ({
          productId: id,
          variantName: v.variantName,
          sku: v.sku,
          price: v.price,
          minOrderQuantity: v.minOrderQuantity,
          measurementUnitId: v.measurementUnitId,
        })),
      });

      return p;
    });

    // Триггер синхронизации с Elastic
    await this.syncQueue.add('index-product', { productId: id });

    // Возвращаем актуальные данные
    return this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: true },
    });
  }

  async delete(id: number, supplierId: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Вы можете удалять только свои товары');
    }

    await this.prisma.product.delete({ where: { id } });
    await this.syncQueue.add('delete-product', { productId: id });

    return { message: 'Товар удален' };
  }

  async getMyProducts(supplierId: number) {
    return this.prisma.product.findMany({
      where: { supplierCompanyId: supplierId },
      include: { variants: true, status: true, category: true, images: true },
    });
  }
}