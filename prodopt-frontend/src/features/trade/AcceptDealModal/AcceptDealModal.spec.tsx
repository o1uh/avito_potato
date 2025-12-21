import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AcceptDealModal } from './index';
import { dealApi } from '@/entities/deal/api/deal.api';
import { companyApi } from '@/entities/user/api/company.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('@/entities/deal/api/deal.api');
jest.mock('@/entities/user/api/company.api');

const mockedDealApi = dealApi as jest.Mocked<typeof dealApi>;
const mockedCompanyApi = companyApi as jest.Mocked<typeof companyApi>;

// Fix Ant Design matchMedia
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

const queryClient = new QueryClient();

const mockOffer = {
  id: 10,
  offerPrice: 5000,
  items: [{ quantity: 10, pricePerUnit: 500, productVariant: { product: { name: 'Prod' } } }],
  purchaseRequest: { requestedQuantity: 10 } // Equal quantity -> checkbox checked default
} as any;

describe('Feature: AcceptDealModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDealApi.createFromOffer.mockResolvedValue({ id: 99 } as any);
    mockedDealApi.accept.mockResolvedValue({} as any);
    
    mockedCompanyApi.getMyCompany.mockResolvedValue({
      addresses: [
        { address: { id: 1, city: 'Msk', street: 'Lenina' }, addressType: { name: 'Склад' } }
      ]
    } as any);
  });

  it('should validate address requirement', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcceptDealModal open={true} offer={mockOffer} onCancel={jest.fn()} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Пытаемся нажать подтвердить без выбора адреса
    await act(async () => {
        fireEvent.click(screen.getByText('Подтвердить и создать сделку'));
    });

    await waitFor(() => {
      expect(screen.getByText('Выберите адрес')).toBeInTheDocument();
      expect(mockedDealApi.createFromOffer).not.toHaveBeenCalled();
    });
  });

  it('should submit successfully with address and default checkbox', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcceptDealModal open={true} offer={mockOffer} onCancel={jest.fn()} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Ждем загрузки адресов
    await waitFor(() => expect(mockedCompanyApi.getMyCompany).toHaveBeenCalled());

    // Выбираем адрес (Select в AntD сложный, имитируем mouseDown и click)
    const select = document.querySelector('.ant-select-selector') as HTMLElement;
    fireEvent.mouseDown(select);
    const option = await screen.findByText(/Склад: Msk, Lenina/);
    fireEvent.click(option);

    // Проверяем, что чекбокс выбран по умолчанию (т.к. кол-во совпадает)
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // Сабмит
    await act(async () => {
        fireEvent.click(screen.getByText('Подтвердить и создать сделку'));
    });

    await waitFor(() => {
      // 1. Создание сделки с closeRequest: true
      expect(mockedDealApi.createFromOffer).toHaveBeenCalledWith(10, true);
      // 2. Принятие сделки с addressId: 1
      expect(mockedDealApi.accept).toHaveBeenCalledWith(99, 1);
    });
  });
});