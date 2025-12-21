import { Product } from '@/entities/product/model/types';

export interface AdminStats {
  users: number;
  companies: number;
  successfulDeals: number;
  activeDisputes: number;
}

export interface ModerationQueueItem extends Product {
  // Наследуем тип Product, так как бэкенд возвращает структуру товара
}