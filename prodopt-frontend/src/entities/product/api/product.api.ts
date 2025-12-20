import { $api } from '@/shared/api/base';
import { Product, ProductSearchParams, ProductSearchResponse } from '../model/types';

export const productApi = {
  // Поиск товаров через Elastic (публичный доступ, если настроено, или только для авторизованных)
  search: async (params: ProductSearchParams) => {
    const response = await $api.post<ProductSearchResponse>('/catalog/search', params);
    return response.data;
  },

  // Получение одного товара по ID
  // Примечание: Эндпоинт GET /products/:id должен быть реализован на бэкенде. 
  // Если его нет, можно временно использовать search с фильтром по ID, но правильнее иметь прямой метод.
  getOne: async (id: number | string) => {
    const response = await $api.get<Product>(`/products/${id}`);
    return response.data;
  },

  // (Для поставщика) Создание товара
  create: async (data: any) => {
    const response = await $api.post<Product>('/products', data);
    return response.data;
  },
  
  // Загрузка изображений
  uploadImage: async (productId: number, file: File, variantId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Формируем URL с параметром variantId, если он передан
    const url = variantId 
        ? `/products/${productId}/images?variantId=${variantId}` 
        : `/products/${productId}/images`;

    const response = await $api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  publish: async (id: number) => {
    const response = await $api.patch<Product>(`/products/${id}/publish`);
    return response.data;
  }
};