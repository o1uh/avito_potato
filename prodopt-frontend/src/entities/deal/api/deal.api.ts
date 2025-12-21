import { $api } from '@/shared/api/base';
import { Deal, CreateDealFromOfferDto } from '../model/types';

export const dealApi = {
  getAll: async () => {
    const response = await $api.get<Deal[]>('/trade/deals');
    return response.data;
  },

  getOne: async (id: number) => {
    const response = await $api.get<Deal>(`/trade/deals/${id}`);
    return response.data;
  },

  createFromOffer: async (offerId: number, closeRequest: boolean) => {
    const dto: CreateDealFromOfferDto = { offerId, closeRequest };
    const response = await $api.post<Deal>('/trade/deals/from-offer', dto);
    return response.data;
  },

  accept: async (id: number, addressId: number) => {
    const response = await $api.post<Deal>(`/trade/deals/${id}/accept`, { deliveryAddressId: addressId });
    return response.data;
  },

  payDev: async (id: number, amount: number) => {
    const response = await $api.post(`/dev/trade/deals/${id}/deposit`, { amount });
    return response.data;
  },

  payProd: async (id: number) => {
    const response = await $api.post<{ paymentUrl: string }>(`/finance/deals/${id}/pay`);
    return response.data;
  },

  addTracking: async (id: number, trackingNumber: string, carrier?: string) => {
    const response = await $api.post<any>(`/trade/deals/${id}/shipment`, { trackingNumber, carrier });
    return response.data;
  },

  confirmDelivery: async (id: number) => {
    const response = await $api.post<Deal>(`/trade/deals/${id}/confirm`);
    return response.data;
  }
};