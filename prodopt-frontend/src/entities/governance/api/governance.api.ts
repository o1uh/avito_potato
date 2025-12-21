import { $api } from '@/shared/api/base';
import { 
  CreateDisputeDto, 
  ResolveDisputeDto, 
  CreateReviewDto, 
  Dispute 
} from '../model/types';

export const governanceApi = {
  // Открыть спор
  openDispute: async (dealId: number, dto: CreateDisputeDto) => {
    const response = await $api.post<Dispute>(`/disputes/${dealId}`, dto);
    return response.data;
  },

  // Разрешить спор
  resolveDispute: async (id: number, dto: ResolveDisputeDto) => {
    const response = await $api.put<Dispute>(`/disputes/${id}/resolve`, dto);
    return response.data;
  },

  // Получить все споры (возвращает массив!)
  getAllDisputes: async () => {
    const response = await $api.get<Dispute[]>('/disputes'); // <Dispute[]> важно для типизации
    return response.data;
  },

  // Оставить отзыв
  createReview: async (dealId: number, dto: CreateReviewDto) => {
    const response = await $api.post(`/reviews/deal/${dealId}`, dto);
    return response.data;
  }
};