import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException  } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateProductDto, UpdateProductDto } from '../dto/catalog.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('catalog-sync') private syncQueue: Queue,
  ) {}

  private async generateUniqueSku(prefix = 'PRD'): Promise<string> {
    let sku = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      // 1. Генерируем кандидат
      // Используем 3 байта (6 символов) + timestamp, это очень надежно
      const randomPart = randomBytes(3).toString('hex').toUpperCase();
      const timestamp = Date.now().toString().slice(-4); 
      sku = `${prefix}-${timestamp}-${randomPart}`;

      // 2. Проверяем в БД (легкий запрос, так как поле sku индексировано)
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku },
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new InternalServerErrorException('Не удалось сгенерировать уникальный артикул. Попробуйте еще раз.');
    }

    return sku;
  }

  async create(supplierId: number, dto: CreateProductDto) {
    // Подготовка вариантов. Так как generateUniqueSku асинхронный, используем Promise.all
    const variantsData = await Promise.all(
      dto.variants.map(async (v) => ({
        variantName: v.variantName,
        // Если SKU передан юзером — используем его. 
        // Если нет — генерируем гарантированно уникальный.
        sku: v.sku ? v.sku : await this.generateUniqueSku(),
        price: v.price,
        minOrderQuantity: v.minOrderQuantity,
        measurementUnitId: v.measurementUnitId,
      }))
    );

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        supplierCompanyId: supplierId,
        productCategoryId: dto.productCategoryId,
        productStatusId: 1, // Draft
        variants: {
          create: variantsData, // Вставляем подготовленный массив
        },
      },
      include: { variants: true },
    });

    await this.syncQueue.add('index-product', { productId: product.id });
    return product;
  }

  async findById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: { measurementUnit: true } // Важно подгрузить единицы измерения
        },
        images: true,
        category: true,
        supplier: true, // Чтобы показать имя поставщика
      },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  async update(id: number, supplierId: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Вы можете редактировать только свои товары');
    }
    const variantsData = await Promise.all(
      dto.variants.map(async (v) => ({
        productId: id,
        variantName: v.variantName,
        sku: v.sku ? v.sku : await this.generateUniqueSku(),
        price: v.price,
        minOrderQuantity: v.minOrderQuantity,
        measurementUnitId: v.measurementUnitId,
      }))
    );
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
        data: variantsData,
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

  async publish(id: number, supplierId: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { images: true } });

    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Нет прав');
    }

    // БИЗНЕС-ЛОГИКА: Нельзя публиковать без фото
    if (product.images.length === 0) {
        throw new BadRequestException('Нельзя опубликовать товар без изображений');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { productStatusId: 2 }, // 2 = Опубликован (Published)
    });

    // Обновляем индекс в Elastic, чтобы товар появился в поиске (или обновил статус)
    await this.syncQueue.add('index-product', { productId: id });

    return updated;
  }
}