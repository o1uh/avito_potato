import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/providers/storage.service';

@Injectable()
export class ProductMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async uploadImage(productId: number, supplierId: number, file: Express.Multer.File) {
    // 1. Проверка прав
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Товар не найден');
    if (product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Нет прав на редактирование этого товара');
    }

    // 2. Загрузка в S3 (MinIO)
    const { key, url } = await this.storageService.upload(file, 'products');

    // 3. Проверка: есть ли уже фото? Если нет, это будет главное фото.
    const count = await this.prisma.productImage.count({ where: { productId } });
    const isMain = count === 0;

    // 4. Сохранение в БД
    const image = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: url, // Сохраняем полный URL или key (в зависимости от архитектуры, тут URL удобнее для фронта)
        isMain,
      },
    });

    return image;
  }

  async deleteImage(imageId: number, supplierId: number) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: true },
    });

    if (!image) throw new NotFoundException('Изображение не найдено');
    if (image.product.supplierCompanyId !== supplierId) {
      throw new ForbiddenException('Нет прав');
    }

    // Удаляем запись из БД
    await this.prisma.productImage.delete({ where: { id: imageId } });
    
    // (Опционально) Удалить файл из S3, если нужно экономить место
    // const key = image.imageUrl.split('/').pop(); 
    // await this.storageService.delete(`products/${key}`);

    return { message: 'Изображение удалено' };
  }
}