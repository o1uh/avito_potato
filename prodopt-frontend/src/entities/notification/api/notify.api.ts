import { $api } from '@/shared/api/base';
import { NotificationsResponse } from '../model/types';

export const notifyApi = {
  getMy: async (unreadOnly = false, limit = 20) => {
    const response = await $api.get<NotificationsResponse>('/notifications', {
      params: { unreadOnly, limit },
    });
    return response.data;
  },

  markRead: async (id: number) => {
    await $api.patch(`/notifications/${id}/read`);
  },

  readAll: async () => {
    await $api.patch('/notifications/read-all');
  },

  // --- Новое ---
  sendTest: async () => {
    await $api.post('/notifications/test-send');
  }
};