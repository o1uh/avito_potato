import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

import { ProductsController } from './controllers/products.controller';
import { SearchController } from './controllers/search.controller';
import { ProductsService } from './services/products.service';
import { SearchService } from './services/search.service';
import { ElasticSyncConsumer } from './consumers/elastic-sync.consumer';
import { ProductMediaService } from './services/product-media.service';


@Module({
  imports: [
    PrismaModule,
    // Настройка очереди BullMQ
    BullModule.registerQueue({
      name: 'catalog-sync',
    }),
    // Настройка Elastic Client
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // ИСПРАВЛЕНИЕ: Дефолтный хост изменен на localhost для локальной разработки и тестов
        node: configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ProductsController, SearchController],
  providers: [ProductsService, SearchService, ElasticSyncConsumer, ProductMediaService],
  exports: [ProductsService, SearchService],
})
export class CatalogModule implements OnModuleInit {
  constructor(private readonly searchService: SearchService) {}

  async onModuleInit() {
    // При старте проверяем/создаем индекс
    await this.searchService.createIndexIfNotExists();
  }
}