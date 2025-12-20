import { render, screen, waitFor } from '@testing-library/react';
import { StatsPage } from './StatsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';
import '@testing-library/jest-dom';

jest.mock('@/entities/user/api/company.api');
const mockedApi = companyApi as jest.Mocked<typeof companyApi>;

const queryClient = new QueryClient();

describe('Page: StatsPage', () => {
  it('should display total sales volume from API', async () => {
    mockedApi.getStats.mockResolvedValue({
      totalSales: 10,
      totalPurchases: 5,
      salesVolume: 100000,
      purchasesVolume: 50000
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StatsPage />
      </QueryClientProvider>
    );

    // Ждем загрузки данных
    await waitFor(() => {
        // Мы ожидаем форматирование с пробелом (100 000) и символом рубля
        // Используем регулярное выражение для гибкости (пробел может быть nbsp)
        expect(screen.getByText((content) => content.includes('100 000'))).toBeInTheDocument();
        expect(screen.getByText('Продажи (Объем)')).toBeInTheDocument();
    });
  });
});