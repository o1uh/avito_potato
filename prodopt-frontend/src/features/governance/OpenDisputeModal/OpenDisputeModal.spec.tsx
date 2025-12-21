import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { OpenDisputeModal } from './index';
import { governanceApi } from '@/entities/governance/api/governance.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// 1. Мокаем API
jest.mock('@/entities/governance/api/governance.api');
const mockedApi = governanceApi as jest.Mocked<typeof governanceApi>;

// 2. Фикс для Ant Design (matchMedia)
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

describe('Feature: OpenDisputeModal', () => {
  const onCancelMock = jest.fn();
  const dealId = 100;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should validate empty form submission', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OpenDisputeModal dealId={dealId} isOpen={true} onCancel={onCancelMock} />
      </QueryClientProvider>
    );

    // Пытаемся отправить пустую форму
    // Используем act для обработки обновлений состояния Ant Design
    await act(async () => {
      fireEvent.click(screen.getByText('Открыть спор'));
    });

    // Ожидаем появления сообщений валидации
    await waitFor(() => {
      expect(screen.getByText('Укажите причину')).toBeInTheDocument();
      expect(screen.getByText('Опишите требования')).toBeInTheDocument();
    });

    // Проверяем, что API не вызывался
    expect(mockedApi.openDispute).not.toHaveBeenCalled();
  });

  it('should call API and close modal on success', async () => {
    mockedApi.openDispute.mockResolvedValue({ id: 1 } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <OpenDisputeModal dealId={dealId} isOpen={true} onCancel={onCancelMock} />
      </QueryClientProvider>
    );

    // Заполняем поля
    fireEvent.change(screen.getByLabelText('Причина спора'), { 
      target: { value: 'Товар испорчен' } 
    });
    
    fireEvent.change(screen.getByLabelText('Ваши требования'), { 
      target: { value: 'Вернуть деньги' } 
    });

    // Сабмит
    await act(async () => {
      fireEvent.click(screen.getByText('Открыть спор'));
    });

    // Проверки
    await waitFor(() => {
      // 1. Вызов API с правильными данными
      expect(mockedApi.openDispute).toHaveBeenCalledWith(
        dealId,
        expect.objectContaining({
          reason: 'Товар испорчен',
          demands: 'Вернуть деньги'
        })
      );

      // 2. Закрытие модалки
      expect(onCancelMock).toHaveBeenCalled();
    });
  });
});