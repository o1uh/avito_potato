import { $api } from '@/shared/api/base';
import { NotificationsResponse } from '../model/types';

export const notifyApi = {
  // Получение списка (можно фильтровать только непрочитанные)
  getMy: async (unreadOnly = false, limit = 20) => {
    const response = await $api.get<NotificationsResponse>('/notifications', {
      params: { unreadOnly, limit },
    });
    return response.data;
  },

  // Пометить конкретное как прочитанное
  markRead: async (id: number) => {
    await $api.patch(`/notifications/${id}/read`);
  },

  // Пометить все как прочитанные
  readAll: async () => {
    await $api.patch('/notifications/read-all');
  },
};