import { $api } from '@/shared/api/base';
import { CommercialOffer, CreateOfferDto, NegotiateOfferDto } from '../model/types';

export const offerApi = {
  create: async (dto: CreateOfferDto) => {
    const response = await $api.post<CommercialOffer>('/trade/offers', dto);
    return response.data;
  },

  negotiate: async (id: number, dto: NegotiateOfferDto) => {
    const response = await $api.put<CommercialOffer>(`/trade/offers/${id}`, dto);
    return response.data;
  },

  getAll: async (type: 'sent' | 'received') => {
    const response = await $api.get<CommercialOffer[]>('/trade/offers', {
      params: { type },
    });
    return response.data;
  },

  reject: async (id: number) => {
    const response = await $api.patch<CommercialOffer>(`/trade/offers/${id}/reject`);
    return response.data;
  },
};