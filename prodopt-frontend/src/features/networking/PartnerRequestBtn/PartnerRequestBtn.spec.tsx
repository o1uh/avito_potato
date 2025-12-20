import { render, screen } from '@testing-library/react';
import { PartnerRequestBtn } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Создаем тестовый клиент
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

// Мокаем API
jest.mock('@/entities/partner/api/partner.api', () => ({
  partnerApi: {
    sendRequest: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
  }
}));

describe('Component: PartnerRequestBtn', () => {
  it('should render "Добавить" when status is NONE', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PartnerRequestBtn status="NONE" targetCompanyId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Добавить')).toBeInTheDocument();
  });

  it('should render "Принять" when status is PENDING_INCOMING', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PartnerRequestBtn status="PENDING_INCOMING" requestId={100} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Принять')).toBeInTheDocument();
    // Проверяем наличие кнопки отклонения (по иконке или тексту, если он есть)
    // В нашем коде там иконка CloseOutlined и текст "Откл."
    expect(screen.getByText('Откл.')).toBeInTheDocument();
  });

  it('should render disabled state when status is PENDING_OUTGOING', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PartnerRequestBtn status="PENDING_OUTGOING" requestId={100} />
      </QueryClientProvider>
    );

    const button = screen.getByText('Отправлен').closest('button');
    expect(button).toBeDisabled();
  });
});