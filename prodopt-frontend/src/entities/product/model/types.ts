import { Company } from '@/entities/user/model/types';

export interface ProductImage {
  id: number;
  imageUrl: string;
  isMain: boolean;
}

export interface ProductCategory {
  id: number;
  name: string;
  parentId?: number | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  variantName: string;
  price: number; // number, так как приходит из Elastic/API как число
  minOrderQuantity: number;
  stockQuantity?: number | null;
  measurementUnitId: number;
  measurementUnit?: { id: number; name: string };
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  supplierCompanyId: number;
  productCategoryId: number;
  
  // Relations
  category?: ProductCategory;
  supplier?: Company;
  images: ProductImage[];
  variants: ProductVariant[];
  
  // Дополнительные поля из Elastic
  minPrice?: number;
  maxPrice?: number;
}

// Параметры поиска
export interface ProductSearchParams {
  q?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

// Ответ поиска
export interface ProductSearchResponse {
  items: Product[];
  total: number;
  facets: {
    categoryId: number;
    name: string;
    count: number;
  }[];
}