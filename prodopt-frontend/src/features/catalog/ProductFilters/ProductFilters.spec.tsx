import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductFilters } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { referencesApi } from '@/shared/api/references.api';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Мокаем API справочников
jest.mock('@/shared/api/references.api');
const mockedApi = referencesApi as jest.Mocked<typeof referencesApi>;

// Мокаем setSearchParams из react-router-dom
const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
}));

// Фикс для Ant Design (matchMedia)
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

describe('Feature: ProductFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ВАЖНО: Очищаем кэш перед каждым тестом, чтобы useQuery делал новый запрос
    queryClient.clear();
    
    mockedApi.getCategories.mockResolvedValue({
      data: [
        { id: 1, name: 'Молоко' },
        { id: 2, name: 'Хлеб' }
      ]
    } as any);
  });

  it('should update URL params on search submit', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProductFilters />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const minPriceInput = screen.getByPlaceholderText('От');
    fireEvent.change(minPriceInput, { target: { value: '100' } });

    const maxPriceInput = screen.getByPlaceholderText('До');
    fireEvent.change(maxPriceInput, { target: { value: '500' } });

    const submitBtn = screen.getByText('Найти');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: '100',
          maxPrice: '500',
          offset: '0'
        })
      );
    });
  });

  it('should load categories into select', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProductFilters />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Ждем, пока хук useQuery вызовет API
    await waitFor(() => {
      expect(mockedApi.getCategories).toHaveBeenCalled();
    });
  });
});