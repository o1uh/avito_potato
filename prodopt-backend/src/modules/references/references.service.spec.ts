import { Test, TestingModule } from '@nestjs/testing';
import { ReferencesService } from './references.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ReferencesService', () => {
  let service: ReferencesService;
  let prisma: PrismaService;
  let cacheManager: any;

  const mockPrisma = {
    productCategory: {
      findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Молочная продукция' }]),
    },
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferencesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<ReferencesService>(ReferencesService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  // --- Тест согласно заданию: getCategories ---
  
  it('getCategories: должен сделать запрос в БД и сохранить в кэш (Cache Miss)', async () => {
    // Кэш пуст
    mockCache.get.mockResolvedValue(null);

    const result = await service.getCategories();

    expect(result).toEqual([{ id: 1, name: 'Молочная продукция' }]);
    expect(prisma.productCategory.findMany).toHaveBeenCalledTimes(1); // Запрос ушел в БД
    expect(mockCache.set).toHaveBeenCalledWith('ref_categories', expect.any(Array), expect.any(Number));
  });

  it('getCategories: должен вернуть данные из кэша БЕЗ запроса в БД (Cache Hit)', async () => {
    // В кэше есть данные
    const cachedData = [{ id: 1, name: 'Молочная продукция (cached)' }];
    mockCache.get.mockResolvedValue(cachedData);

    const result = await service.getCategories();

    expect(result).toEqual(cachedData);
    expect(prisma.productCategory.findMany).not.toHaveBeenCalled(); // Запрос в БД НЕ ушел
  });
});