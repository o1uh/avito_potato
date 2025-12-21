import { $api } from '@/shared/api/base';
import { AdminStats, ModerationQueueItem } from '../model/types';

export const adminApi = {
  getStats: async () => {
    const response = await $api.get<AdminStats>('/admin/stats');
    return response.data;
  },

  getModerationQueue: async () => {
    const response = await $api.get<ModerationQueueItem[]>('/admin/moderation/products');
    return response.data;
  },

  approveProduct: async (id: number) => {
    const response = await $api.patch(`/admin/moderation/products/${id}/approve`);
    return response.data;
  },

  rejectProduct: async (id: number) => {
    const response = await $api.patch(`/admin/moderation/products/${id}/reject`); // Убедитесь, что на бэке есть этот метод, иначе используем update
    return response.data;
  }
};