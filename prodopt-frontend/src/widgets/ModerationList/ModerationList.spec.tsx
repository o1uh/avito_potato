import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ModerationList } from './index';
import { adminApi } from '@/entities/admin/api/admin.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

jest.mock('@/entities/admin/api/admin.api');
const mockedApi = adminApi as jest.Mocked<typeof adminApi>;

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

const mockProducts = [
  {
    id: 1,
    name: 'Suspicious Product',
    supplier: { name: 'Bad Supplier' },
    category: { name: 'Food' },
    updatedAt: new Date().toISOString(),
    images: [],
    variants: []
  }
];

describe('Widget: ModerationList', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should list items and approve product', async () => {
    mockedApi.getModerationQueue.mockResolvedValue(mockProducts as any);
    mockedApi.approveProduct.mockResolvedValue({ success: true } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ModerationList />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Suspicious Product')).toBeInTheDocument();

    // Открываем модалку
    const previewBtn = document.querySelector('.anticon-eye')?.closest('button');
    if (previewBtn) fireEvent.click(previewBtn);

    expect(await screen.findByText('Просмотр товара')).toBeInTheDocument();

    // Жмем Одобрить
    const approveBtn = screen.getByText('Одобрить');
    await act(async () => {
        fireEvent.click(approveBtn);
    });

    await waitFor(() => {
        // ИСПРАВЛЕНО: React Query передает дополнительные метаданные вторым аргументом.
        // Проверяем, что первый аргумент (ID) равен 1.
        expect(mockedApi.approveProduct).toHaveBeenCalledWith(1, expect.anything());
    });

    // Проверяем обновление списка
    expect(mockedApi.getModerationQueue).toHaveBeenCalledTimes(2);
  });
});