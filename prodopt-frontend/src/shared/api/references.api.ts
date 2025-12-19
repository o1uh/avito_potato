import { $api } from './base';
import { ApiResponse } from './types';

export interface ReferenceItem {
  id: number;
  name: string;
}

export const referencesApi = {
  // Получить список категорий товаров
  getCategories: async () => {
    const response = await $api.get<ApiResponse<ReferenceItem[]>>('/references/categories');
    return response.data;
  },

  // Получить единицы измерения
  getUnits: async () => {
    const response = await $api.get<ApiResponse<ReferenceItem[]>>('/references/units');
    return response.data;
  },

  // Получить типы организаций (ООО, ИП)
  getOrgTypes: async () => {
    const response = await $api.get<ApiResponse<ReferenceItem[]>>('/references/org-types');
    return response.data;
  },
};