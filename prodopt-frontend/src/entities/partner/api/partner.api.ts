import { $api } from '@/shared/api/base';
import { CooperationRequest } from '../model/types';

export const partnerApi = {
  // Получить список всех запросов (входящих, исходящих, одобренных)
  getRequests: async () => {
    const response = await $api.get<CooperationRequest[]>('/networking/requests');
    // Бэкенд возвращает массив напрямую в этом эндпоинте (судя по контроллеру)
    return response.data;
  },

  // Отправить запрос на сотрудничество
  sendRequest: async (recipientId: number, message: string) => {
    const response = await $api.post<CooperationRequest>('/networking/requests', {
      recipientId,
      message,
    });
    return response.data;
  },

  // Принять запрос
  approveRequest: async (requestId: number) => {
    const response = await $api.put<CooperationRequest>(`/networking/requests/${requestId}/approve`);
    return response.data;
  },

  // Отклонить запрос (Пока заглушка, так как на бэкенде нет метода reject в контроллере,
  // но интерфейс кнопки этого требует. Реализуем позже или удалим на UI)
  rejectRequest: async (requestId: number) => {
    // throw new Error("Method not implemented on backend");
    console.warn('Reject logic not implemented on backend yet for request:', requestId);
    return Promise.resolve(); 
  }
};