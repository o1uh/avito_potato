import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProductForm } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { referencesApi } from '@/shared/api/references.api';
import '@testing-library/jest-dom';

// Мокаем API
jest.mock('@/shared/api/references.api');
jest.mock('@/entities/product/api/product.api', () => ({
  productApi: {
    create: jest.fn(),
    uploadImage: jest.fn()
  }
}));

const mockedRefs = referencesApi as jest.Mocked<typeof referencesApi>;

// Фикс для Ant Design
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

describe('Feature: CreateProductWizard', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();

    // Мок категорий для первого шага
    mockedRefs.getCategories.mockResolvedValue({
      data: [{ id: 1, name: 'Молочная продукция' }]
    } as any);

    // Мок единиц измерения для второго шага
    mockedRefs.getUnits.mockResolvedValue({
      data: [{ id: 1, name: 'шт' }]
    } as any);
  });

  it('should navigate through steps and persist data on back', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateProductForm />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // 1. ШАГ 1: Заполнение
    await waitFor(() => expect(screen.getByLabelText('Название товара')).toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText('Название товара'), { target: { value: 'Тестовый Товар' } });
    fireEvent.change(screen.getByLabelText('Описание'), { target: { value: 'Описание товара' } });
    
    // Выбор категории
    const categorySelect = screen.getByLabelText('Категория');
    fireEvent.mouseDown(categorySelect);
    const option = await screen.findByText('Молочная продукция');
    fireEvent.click(option);

    // Переход на Шаг 2
    fireEvent.click(screen.getByText('Далее: Варианты фасовки'));

    // 2. ШАГ 2: Проверка перехода
    // ИСПРАВЛЕНИЕ: Используем регулярное выражение для частичного поиска текста
    await waitFor(() => {
      expect(screen.getByText(/Добавьте хотя бы один вариант товара/i)).toBeInTheDocument();
    });

    // 3. ПЕРЕКЛЮЧЕНИЕ НАЗАД
    fireEvent.click(screen.getByText('Назад'));

    // 4. ПРОВЕРКА СОХРАНЕНИЯ ДАННЫХ
    await waitFor(() => {
      expect(screen.getByLabelText('Название товара')).toHaveValue('Тестовый Товар');
      expect(screen.getByLabelText('Описание')).toHaveValue('Описание товара');
      expect(screen.getByTitle('Молочная продукция')).toBeInTheDocument();
    });
  });
});