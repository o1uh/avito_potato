import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: ElasticsearchService;

  const mockElasticsearchService = {
    search: jest.fn(),
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should build correct DSL query with text search', async () => {
    const searchDto = { q: 'Сыр', limit: 10, offset: 0 };
    
    // Мок ответа
    mockElasticsearchService.search.mockResolvedValue({
      hits: { total: { value: 0 }, hits: [] },
      aggregations: {},
    });

    await service.search(searchDto);

    // Проверяем аргументы вызова search
    expect(mockElasticsearchService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'products',
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                multi_match: expect.objectContaining({
                  query: 'Сыр',
                  fields: ['name^3', 'description', 'variants.sku', 'variants.variantName'],
                }),
              }),
            ]),
          }),
        }),
      }),
    );
  });

  it('should build correct DSL query with filters (nested price)', async () => {
    const searchDto = { minPrice: 100, maxPrice: 500 };

    mockElasticsearchService.search.mockResolvedValue({
      hits: { total: { value: 0 }, hits: [] },
      aggregations: {},
    });

    await service.search(searchDto);

    expect(mockElasticsearchService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              expect.objectContaining({
                nested: expect.objectContaining({
                  path: 'variants',
                  query: {
                    range: {
                      'variants.price': { gte: 100, lte: 500 },
                    },
                  },
                }),
              }),
            ]),
          }),
        }),
      }),
    );
  });
});