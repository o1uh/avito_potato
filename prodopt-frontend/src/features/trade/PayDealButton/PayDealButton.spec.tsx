import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayDealButton } from './index';
import { dealApi } from '@/entities/deal/api/deal.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ENV } from '@/shared/config/env';
import { browser } from '@/shared/lib/browser';
import '@testing-library/jest-dom';

// Мокаем модули
jest.mock('@/entities/deal/api/deal.api');
jest.mock('@/shared/config/env', () => ({
  ENV: {
    API_URL: 'http://localhost:3000',
    DEV: true,
  },
}));
jest.mock('@/shared/lib/browser', () => ({
  browser: {
    location: {
      assign: jest.fn(),
    },
  },
}));

const mockedApi = dealApi as jest.Mocked<typeof dealApi>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockDeal = {
  id: 1,
  totalAmount: 5000,
  escrowAccount: { amountDeposited: 0 },
} as any;

describe('Feature: PayDealButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    // Сброс ENV
    (ENV as any).DEV = true;
    // Сброс реализации мока API, чтобы не влияло на другие тесты
    mockedApi.payDev.mockReset();
    mockedApi.payProd.mockReset();
  });

  it('DEV Mode: should open modal and call dev api', async () => {
    (ENV as any).DEV = true;
    
    // Настраиваем успешный ответ для dev api
    mockedApi.payDev.mockResolvedValue({ success: true });

    render(
      <QueryClientProvider client={queryClient}>
        <PayDealButton deal={mockDeal} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText(/Оплатить/));
    expect(screen.getByText('[DEV] Эмуляция оплаты')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Внести средства'));

    await waitFor(() => {
      expect(mockedApi.payDev).toHaveBeenCalledWith(1, 5000);
    });
  });

  it('PROD Mode: should redirect via location.assign', async () => {
    (ENV as any).DEV = false;

    const paymentUrl = 'http://bank.com/pay';
    // Явно задаем реализацию для этого теста
    mockedApi.payProd.mockResolvedValue({ paymentUrl });

    render(
      <QueryClientProvider client={queryClient}>
        <PayDealButton deal={mockDeal} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText(/Оплатить/));

    await waitFor(() => {
      // Проверяем, что API вызвался
      expect(mockedApi.payProd).toHaveBeenCalledWith(1);
      // Проверяем, что редирект произошел
      expect(browser.location.assign).toHaveBeenCalledWith(paymentUrl);
    });
  });
});