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

    const mustQueries: any[] = [];
    const filterQueries: any[] = [];

    // 1. Полнотекстовый поиск
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

    // 2. Фильтры
    if (categoryId) {
      filterQueries.push({ term: { categoryId: categoryId } });
    }

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
      // ИСПРАВЛЕНИЕ: Параметры передаются на верхнем уровне, без 'body'
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from: offset,
        size: limit,
        query: {
          bool: {
            must: mustQueries,
            filter: filterQueries,
          },
        },
        // 3. Агрегации (Фасеты)
        aggregations: {
          categories: {
            terms: {
              field: 'categoryId',
              size: 20,
            },
            aggs: {
              category_name: {
                terms: {
                  field: 'categoryName.keyword',
                  size: 1
                }
              }
            }
          },
        },
      });

      const hits = response.hits;
      const aggregations = response.aggregations;

      // Маппинг результатов агрегации
      const facets = (aggregations?.categories as any)?.buckets.map((bucket: any) => ({
        categoryId: bucket.key,
        count: bucket.doc_count,
        name: bucket.category_name?.buckets?.[0]?.key || 'Unknown',
      })) || [];

      return {
        total: (hits.total as any).value,
        items: hits.hits.map((hit) => hit._source),
        facets: facets,
      };
    } catch (error) {
      this.logger.error(`Elastic search error: ${error.message}`);
      return { total: 0, items: [], facets: [] };
    }
  }

  async createIndexIfNotExists() {
    const indexExists = await this.elasticsearchService.indices.exists({ index: this.indexName });
    if (!indexExists) {
      // ИСПРАВЛЕНИЕ: 'mappings' передается на верхнем уровне
      await this.elasticsearchService.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            id: { type: 'integer' },
            name: { type: 'text', analyzer: 'russian' },
            description: { type: 'text', analyzer: 'russian' },
            categoryId: { type: 'integer' },
            categoryName: { 
              type: 'text',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
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
  }
}