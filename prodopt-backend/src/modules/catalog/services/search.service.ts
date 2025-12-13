import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchProductDto } from '../dto/catalog.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'products';

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async search(dto: SearchProductDto) {
    const { q, categoryId, minPrice, maxPrice, limit, offset } = dto;

    // Формируем массив условий (must)
    const mustQueries: any[] = [];
    const filterQueries: any[] = [];

    // Полнотекстовый поиск
    if (q) {
      mustQueries.push({
        multi_match: {
          query: q,
          fields: ['name^3', 'description', 'variants.sku', 'variants.variantName'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustQueries.push({ match_all: {} });
    }

    // Фильтры
    if (categoryId) {
      filterQueries.push({ term: { categoryId: categoryId } });
    }

    // Фильтр по цене (Nested query, т.к. цена внутри массива variants)
    if (minPrice !== undefined || maxPrice !== undefined) {
      const range: any = {};
      if (minPrice !== undefined) range.gte = minPrice;
      if (maxPrice !== undefined) range.lte = maxPrice;

      filterQueries.push({
        nested: {
          path: 'variants',
          query: {
            range: { 'variants.price': range },
          },
        },
      });
    }

    try {
      const result = await this.elasticsearchService.search({
        index: this.indexName,
        from: offset,
        size: limit,
        query: {
          bool: {
            must: mustQueries,
            filter: filterQueries,
          },
        },
      });

      // Маппинг результатов (возвращаем только source)
      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total;

      return {
        total: total,
        items: hits.map((hit) => hit._source),
      };
    } catch (error) {
      this.logger.error(`Elastic search error: ${error.message}`);
      // В случае ошибки Elastic можно фолбэкнуться на БД, но пока возвращаем пустой результат
      return { total: 0, items: [] };
    }
  }

  // Метод для создания индекса (можно вызывать при старте или миграции)
  async createIndexIfNotExists() {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({ index: this.indexName });
      if (!indexExists) {
        await this.elasticsearchService.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { type: 'text', analyzer: 'russian' },
              description: { type: 'text', analyzer: 'russian' },
              categoryId: { type: 'integer' },
              supplierId: { type: 'integer' },
              variants: {
                type: 'nested',
                properties: {
                  sku: { type: 'keyword' },
                  price: { type: 'float' },
                  variantName: { type: 'text' },
                },
              },
            },
          },
        });
        this.logger.log(`Index ${this.indexName} created`);
      }
    } catch (e) {
      this.logger.error(`Error checking/creating index: ${e.message}`);
    }
  }
}