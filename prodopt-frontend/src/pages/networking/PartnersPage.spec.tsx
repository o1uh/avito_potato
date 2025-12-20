import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PartnersPage } from './PartnersPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { partnerApi } from '@/entities/partner/api/partner.api';
import '@testing-library/jest-dom';

// Мокаем API
jest.mock('@/entities/partner/api/partner.api');
const mockedApi = partnerApi as jest.Mocked<typeof partnerApi>;

// Мокаем права доступа (permissions), чтобы задать companyId
jest.mock('@/shared/lib/permissions', () => ({
  usePermission: () => ({ companyId: 10 }),
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

describe('Page: PartnersPage', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const mockRequests = [
    // Активный партнер
    {
      id: 1,
      request_status_id: 2, // APPROVED
      initiator_company_id: 10, // Мы
      recipient_company_id: 20,
      recipientCompany: { id: 20, name: 'Partner Co', inn: '1234567890' }
    },
    // Входящий запрос
    {
      id: 2,
      request_status_id: 1, // PENDING
      initiator_company_id: 30,
      recipient_company_id: 10, // Мы
      initiatorCompany: { id: 30, name: 'New Request LLC', inn: '0987654321' },
      message: 'Хотим сотрудничать'
    }
  ];

  it('should render active partners and incoming requests', async () => {
    mockedApi.getRequests.mockResolvedValue(mockRequests as any);

    render(
      <QueryClientProvider client={queryClient}>
        <PartnersPage />
      </QueryClientProvider>
    );

    // 1. Проверяем отрисовку активного партнера (Таб "Мои партнеры" активен по умолчанию)
    // findByText автоматически ждет появления элемента (ждет завершения загрузки)
    expect(await screen.findByText('Partner Co')).toBeInTheDocument();

    // 2. Переключаемся на таб "Входящие запросы"
    const incomingTab = screen.getByText(/Входящие запросы/i);
    fireEvent.click(incomingTab);

    // 3. Проверяем отрисовку входящего запроса
    await waitFor(() => {
      expect(screen.getByText('New Request LLC')).toBeInTheDocument();
      expect(screen.getByText('"Хотим сотрудничать"')).toBeInTheDocument();
    });
  });

  it('should call approve API when clicking "Принять"', async () => {
    mockedApi.getRequests.mockResolvedValue(mockRequests as any);
    mockedApi.approveRequest.mockResolvedValue({} as any);

    render(
      <QueryClientProvider client={queryClient}>
        <PartnersPage />
      </QueryClientProvider>
    );

    // ВАЖНО: Сначала ждем загрузки данных (появления дефолтного контента),
    // иначе табы еще не существуют в DOM
    await screen.findByText('Partner Co');

    // Теперь переходим во входящие
    fireEvent.click(screen.getByText(/Входящие запросы/i));

    // Ждем появления кнопки (findByText сам ждет)
    const approveBtn = await screen.findByText('Принять');
    
    // Кликаем
    fireEvent.click(approveBtn);

    // Проверяем вызов API с ID запроса (2)
    await waitFor(() => {
      expect(mockedApi.approveRequest).toHaveBeenCalledWith(2);
    });
  });
});