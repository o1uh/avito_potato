import { $api } from './base';
import { useSessionStore } from '@/entities/session/model/store'; // Будет создан позже, пока просто импорт

// Request Interceptor
$api.interceptors.request.use((config) => {
  // В Zustand сторе будем хранить токены.
  // Так как store - это хук, мы можем использовать getState() вне компонентов.
  const token = useSessionStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
$api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если 401 и это не попытка обновить токен
    if (error.response?.status === 401 && error.config && !error.config._isRetry) {
      originalRequest._isRetry = true;
      try {
        const refreshToken = useSessionStore.getState().refreshToken;
        
        if (!refreshToken) {
            throw new Error('No refresh token');
        }

        // Бэкенд ожидает Refresh Token в заголовке Authorization (см. auth.controller.ts и refresh.strategy.ts)
        const response = await $api.post('/auth/refresh', {}, {
            headers: {
                Authorization: `Bearer ${refreshToken}`
            }
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        // Обновляем стор
        useSessionStore.getState().setTokens(accessToken, newRefreshToken);

        // Повторяем запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return $api.request(originalRequest);

      } catch (e) {
        // Если не вышло обновить - разлогиниваем
        useSessionStore.getState().logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);