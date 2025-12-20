import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductList } from './index';
import { productApi } from '@/entities/product/api/product.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Мокаем API
jest.mock('@/entities/product/api/product.api');
const mockedApi = productApi as jest.Mocked<typeof productApi>;

// Фикс для matchMedia
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

const createTestClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Widget: ProductList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render skeletons while loading', () => {
    mockedApi.search.mockReturnValue(new Promise(() => {}));

    render(
      <QueryClientProvider client={createTestClient()}>
        <BrowserRouter>
          <ProductList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const skeletons = document.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error state and retry button', async () => {
    mockedApi.search.mockRejectedValue(new Error('Network Error'));

    render(
      <QueryClientProvider client={createTestClient()}>
        <BrowserRouter>
          <ProductList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить товары')).toBeInTheDocument();
    });

    const retryBtn = screen.getByText('Попробовать снова');
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(mockedApi.search).toHaveBeenCalledTimes(2);
  });

  it('should render product list on success', async () => {
    const mockProducts = {
      items: [
        // Добавлены ID для вариантов, чтобы убрать Warning: Each child in a list should have a unique "key" prop
        { id: 1, name: 'Тестовый Сыр', variants: [{ id: 101, price: 500, variantName: '5кг' }], images: [] },
        { id: 2, name: 'Молоко', variants: [{ id: 102, price: 100, variantName: '1л' }], images: [] }
      ],
      total: 2,
      facets: []
    };

    mockedApi.search.mockResolvedValue(mockProducts as any);

    render(
      <QueryClientProvider client={createTestClient()}>
        <BrowserRouter>
          <ProductList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Тестовый Сыр')).toBeInTheDocument();
      expect(screen.getByText('Молоко')).toBeInTheDocument();
    });
  });

  it('should render empty state if no products found', async () => {
    mockedApi.search.mockResolvedValue({ items: [], total: 0, facets: [] } as any);

    render(
      <QueryClientProvider client={createTestClient()}>
        <BrowserRouter>
          <ProductList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Товары не найдены')).toBeInTheDocument();
    });
  });
});