import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';

@Processor('catalog-sync')
export class ElasticSyncConsumer extends WorkerHost {
  private readonly logger = new Logger(ElasticSyncConsumer.name);
  private readonly indexName = 'products';

  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {
    super();
  }

  async process(job: Job<{ productId: number }>) {
    this.logger.log(`Processing job ${job.name} for product ${job.data.productId}`);

    try {
      switch (job.name) {
        case 'index-product':
          await this.indexProduct(job.data.productId);
          break;
        case 'delete-product':
          await this.deleteProduct(job.data.productId);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      throw error; // BullMQ повторит попытку
    }
  }

  private async indexProduct(productId: number) {
    // Получаем полные данные из БД (включая связи)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        category: true,
      },
    });

    if (!product) {
      this.logger.warn(`Product ${productId} not found in DB, skipping indexing`);
      return;
    }

    // Формируем документ для Elastic
    const doc = {
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.productCategoryId,
      categoryName: product.category.name,
      supplierId: product.supplierCompanyId,
      updatedAt: product.updatedAt,
      variants: product.variants.map((v) => ({
        sku: v.sku,
        variantName: v.variantName,
        price: Number(v.price), // Decimal -> Number
        minQty: v.minOrderQuantity,
      })),
    };

    // Index (Upsert)
    // В новой версии клиента используем 'document' вместо 'body' для операций индексации
    await this.elasticsearchService.index({
      index: this.indexName,
      id: product.id.toString(),
      document: doc,
    });
    
    this.logger.log(`Product ${productId} indexed successfully`);
  }

  private async deleteProduct(productId: number) {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: productId.toString(),
      });
      this.logger.log(`Product ${productId} removed from index`);
    } catch (e) {
      // Обработка ошибки 404
      if (e.meta && e.meta.statusCode === 404) {
        // Игнорируем, если уже удалено
        return;
      }
      // В новых версиях структура ошибки может отличаться, проверяем message
      if (e.message && e.message.includes('not_found')) {
          return;
      }
      throw e;
    }
  }
}