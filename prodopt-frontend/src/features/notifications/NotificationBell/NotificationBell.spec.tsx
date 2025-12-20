import { render, screen, waitFor, act } from '@testing-library/react';
import { NotificationBell } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyApi } from '@/entities/notification/api/notify.api';
import '@testing-library/jest-dom';

// 1. Мокаем API уведомлений
jest.mock('@/entities/notification/api/notify.api');
const mockedApi = notifyApi as jest.Mocked<typeof notifyApi>;

// 2. Мокаем сессию (авторизован)
jest.mock('@/entities/session/model/store', () => ({
  useSessionStore: (selector: any) => selector({ isAuth: true }),
}));

// 3. Мокаем сокет хук
const socketHandlers: Record<string, (payload: any) => void> = {};
const mockSocket = {
  on: jest.fn((event, callback) => {
    socketHandlers[event] = callback;
  }),
  off: jest.fn(),
};

jest.mock('@/app/providers/SocketProvider', () => ({
  useSocket: () => mockSocket,
}));

// Фикс для matchMedia (Ant Design)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Feature: NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    for (const key in socketHandlers) delete socketHandlers[key];
  });

  it('should fetch unread count on init', async () => {
    // Мокаем ответ API: 2 непрочитанных
    mockedApi.getMy.mockResolvedValue({
      data: [],
      meta: { unreadCount: 2 }
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
    );

    // Проверяем, что API вызвался
    await waitFor(() => {
      expect(mockedApi.getMy).toHaveBeenCalled();
    });

    // ИСПРАВЛЕНИЕ: Используем findByText (асинхронный поиск), так как данные загружаются
    // Ant Design Badge рендерит число просто как текст внутри span
    // Используем title атрибут, так как Antd Badge ставит title равным count
    // Либо ищем текст "2"
    expect(await screen.findByTitle('2')).toBeInTheDocument();
  });

  it('should update badge and show toast on socket event', async () => {
    // 1. Исходное состояние: 2 уведомления
    mockedApi.getMy.mockResolvedValue({
      data: [],
      meta: { unreadCount: 2 }
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
    );

    // Ждем инициализации
    expect(await screen.findByTitle('2')).toBeInTheDocument();

    // 2. Меняем мок API, чтобы при рефетче вернулось уже 3
    mockedApi.getMy.mockResolvedValue({
      data: [],
      meta: { unreadCount: 3 }
    } as any);

    // 3. Эмулируем приход события 'notification' от сокета
    await act(async () => {
      if (socketHandlers['notification']) {
        socketHandlers['notification']({
          title: 'Новая сделка',
          message: 'Покупатель оплатил заказ',
          type: 'SUCCESS'
        });
      }
    });

    // 4. Проверяем, что произошел рефетч данных (инвалидация кэша)
    await waitFor(() => {
        expect(mockedApi.getMy).toHaveBeenCalledTimes(2);
    });

    // 5. Проверяем обновление бейджа до 3
    expect(await screen.findByTitle('3')).toBeInTheDocument();

    // 6. Проверяем появление Toast
    expect(await screen.findByText('Новая сделка')).toBeInTheDocument();
    expect(screen.getByText('Покупатель оплатил заказ')).toBeInTheDocument();
  });
});