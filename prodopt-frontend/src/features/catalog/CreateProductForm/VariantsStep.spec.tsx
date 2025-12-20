import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VariantsStep } from './VariantsStep';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { referencesApi } from '@/shared/api/references.api';
import '@testing-library/jest-dom';

jest.mock('@/shared/api/references.api');
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

describe('Feature Unit: VariantsStep', () => {
  const onFinishMock = jest.fn();
  const onBackMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    mockedRefs.getUnits.mockResolvedValue({
      data: [
        { id: 1, name: 'кг' },
        { id: 2, name: 'шт' }
      ]
    } as any);
  });

  it('should render initial variant form and load units', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <VariantsStep onFinish={onFinishMock} onBack={onBackMock} isLoading={false} />
      </QueryClientProvider>
    );

    // Проверяем наличие полей первого варианта
    expect(screen.getByPlaceholderText('Например: Мешок 50кг')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ART-001')).toBeInTheDocument();

    // Проверяем загрузку единиц измерения
    await waitFor(() => {
      expect(mockedRefs.getUnits).toHaveBeenCalled();
    });

    // Открываем селект
    const unitSelect = document.querySelector('.ant-select-selector') as HTMLElement;
    fireEvent.mouseDown(unitSelect);
    
    // Проверяем опции
    expect(await screen.findByText('кг')).toBeInTheDocument();
    expect(screen.getByText('шт')).toBeInTheDocument();
  });

  it('should add and remove variants dynamically', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <VariantsStep onFinish={onFinishMock} onBack={onBackMock} isLoading={false} />
      </QueryClientProvider>
    );

    // Изначально 1 вариант
    expect(screen.getAllByText(/Вариант #/)).toHaveLength(1);

    // Добавляем вариант
    fireEvent.click(screen.getByText('Добавить вариант'));

    await waitFor(() => {
      expect(screen.getAllByText(/Вариант #/)).toHaveLength(2);
    });

    // Удаляем (ищем иконку удаления)
    // Ant Design иконки рендерятся как span с role='img' и aria-label
    // В нашем коде <MinusCircleOutlined />
    const deleteIcons = document.querySelectorAll('.anticon-minus-circle');
    expect(deleteIcons.length).toBeGreaterThan(0); // Кнопка удаления появляется только если > 1

    fireEvent.click(deleteIcons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Вариант #/)).toHaveLength(1);
    });
  });

  it('should submit form with valid data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <VariantsStep onFinish={onFinishMock} onBack={onBackMock} isLoading={false} />
      </QueryClientProvider>
    );

    // Заполняем поля
    fireEvent.change(screen.getByPlaceholderText('Например: Мешок 50кг'), { target: { value: 'Тест 1' } });
    fireEvent.change(screen.getByPlaceholderText('ART-001'), { target: { value: 'SKU-1' } });
    
    // AntD InputNumber сложнее, находим input внутри
    const priceInput = screen.getByLabelText('Цена (₽)');
    fireEvent.change(priceInput, { target: { value: '100' } });

    // Выбираем Ед. изм.
    const unitSelect = document.querySelector('.ant-select-selector') as HTMLElement;
    fireEvent.mouseDown(unitSelect);
    const option = await screen.findByText('кг');
    fireEvent.click(option);

    // Сабмит
    fireEvent.click(screen.getByText('Создать товар'));

    await waitFor(() => {
      expect(onFinishMock).toHaveBeenCalled();
      // Проверяем структуру отправленных данных
      const submittedData = onFinishMock.mock.calls[0][0];
      expect(submittedData.variants).toHaveLength(1);
      expect(submittedData.variants[0]).toEqual(expect.objectContaining({
        variantName: 'Тест 1',
        sku: 'SKU-1',
        price: 100, // AntD InputNumber возвращает number
        measurementUnitId: 1
      }));
    });
  });
});