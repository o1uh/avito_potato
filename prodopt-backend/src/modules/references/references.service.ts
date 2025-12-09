import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ReferencesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Универсальный метод для получения справочников с кэшированием
  private async getCachedReference(key: string, fetcher: () => Promise<any[]>) {
    const cached = await this.cacheManager.get(key);
    if (cached) {
      return cached;
    }

    const data = await fetcher();
    // TTL 1 час (3600000 ms) - настройки зависят от версии cache-manager
    await this.cacheManager.set(key, data, 3600000); 
    return data;
  }

  async getCategories() {
    return this.getCachedReference('ref_categories', () =>
      this.prisma.productCategory.findMany({ orderBy: { name: 'asc' } }),
    );
  }

  async getUnits() {
    return this.getCachedReference('ref_units', () =>
      this.prisma.measurementUnit.findMany({ orderBy: { name: 'asc' } }),
    );
  }

  async getOrgTypes() {
    return this.getCachedReference('ref_org_types', () =>
      this.prisma.organizationType.findMany(),
    );
  }
}