import { $api } from '@/shared/api/base';
import { PurchaseRequest, CreateRfqDto } from '../model/types';

export const rfqApi = {
  create: async (dto: CreateRfqDto) => {
    const response = await $api.post<PurchaseRequest>('/trade/rfq', dto);
    return response.data;
  },

  getAll: async () => {
    const response = await $api.get<PurchaseRequest[]>('/trade/rfq');
    return response.data;
  },
};