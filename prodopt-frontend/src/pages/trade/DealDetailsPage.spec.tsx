import { render, screen, waitFor } from '@testing-library/react';
import { DealDetailsPage } from './DealDetailsPage';
import { dealApi } from '@/entities/deal/api/deal.api';
import { DealStatus } from '@/shared/config/enums';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Моки
jest.mock('@/entities/deal/api/deal.api');
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '100' }),
  useNavigate: () => jest.fn(),
}));

// Мок хука прав доступа
const mockUsePermission = jest.fn();
jest.mock('@/shared/lib/permissions', () => ({
  usePermission: () => mockUsePermission(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Page: DealDetailsPage', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('Buyer View: Should show "Pay" button when AGREED', async () => {
    mockUsePermission.mockReturnValue({ companyId: 10 }); // Я - Покупатель
    (dealApi.getOne as jest.Mock).mockResolvedValue({
      id: 100,
      dealStatusId: DealStatus.AGREED,
      buyerCompanyId: 10,
      supplierCompanyId: 20,
      escrowAccount: { amountDeposited: 0, totalAmount: 1000 }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DealDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Оплатить/i)).toBeInTheDocument();
      expect(screen.queryByText(/Отгрузить заказ/i)).not.toBeInTheDocument();
    });
  });

  it('Supplier View: Should show "Add Tracking" button when PAID', async () => {
    mockUsePermission.mockReturnValue({ companyId: 20 }); // Я - Поставщик
    (dealApi.getOne as jest.Mock).mockResolvedValue({
      id: 100,
      dealStatusId: DealStatus.PAID,
      buyerCompanyId: 10,
      supplierCompanyId: 20,
      escrowAccount: { amountDeposited: 1000, totalAmount: 1000 }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DealDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Отгрузить заказ/i)).toBeInTheDocument();
      expect(screen.queryByText(/Оплатить/i)).not.toBeInTheDocument();
    });
  });
});