import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CreateOfferForm } from './index';
import { offerApi } from '@/entities/deal/api/offer.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
jest.mock('@/entities/deal/api/offer.api');
const mockedApi = offerApi as jest.Mocked<typeof offerApi>;

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

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Feature: CreateOfferForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should submit new offer (Create Mode)', async () => {
    const mockRfq = {
      id: 10,
      targetVariant: { id: 100, price: 100, product: { name: 'Item' } },
      requestedQuantity: 5
    };

    render(
      <QueryClientProvider client={queryClient}>
        <CreateOfferForm open={true} onClose={jest.fn()} rfq={mockRfq as any} />
      </QueryClientProvider>
    );

    await waitFor(() => {
        const priceInput = screen.getByLabelText(/Итоговая сумма/i);
        expect(priceInput).toHaveValue('500'); 
    });

    fireEvent.change(screen.getByLabelText(/Условия доставки/i), { target: { value: 'Тестовая доставка' } });

    await act(async () => {
        fireEvent.click(screen.getByText('Отправить КП'));
    });

    await waitFor(() => {
      expect(mockedApi.create).toHaveBeenCalled();
      
      // Проверяем аргументы вызова более мягко
      const callArgs = mockedApi.create.mock.calls[0][0];
      expect(callArgs).toEqual(expect.objectContaining({
        requestId: 10,
        offerPrice: 500,
        deliveryConditions: 'Тестовая доставка',
      }));
      // Проверяем наличие обязательных полей, которые мы не можем точно предсказать или не хотим хардкодить
      expect(callArgs.items).toBeInstanceOf(Array);
      expect(typeof callArgs.expiresOn).toBe('string');
    });
  });

  it('should update offer (Negotiate Mode)', async () => {
    const mockOffer = {
      id: 55,
      offerPrice: 1000,
      deliveryConditions: 'Old conditions',
      expiresOn: new Date().toISOString(),
      items: []
    };

    render(
      <QueryClientProvider client={queryClient}>
        <CreateOfferForm open={true} onClose={jest.fn()} existingOffer={mockOffer as any} />
      </QueryClientProvider>
    );

    await waitFor(() => {
        expect(screen.getByLabelText(/Условия доставки/i)).toHaveValue('Old conditions');
    });

    const priceInput = screen.getByLabelText(/Итоговая сумма/i);
    fireEvent.change(priceInput, { target: { value: '1200' } });

    await act(async () => {
        fireEvent.click(screen.getByText('Сохранить изменения'));
    });

    await waitFor(() => {
      // Здесь используем тот же подход
      expect(mockedApi.negotiate).toHaveBeenCalled();
      const callId = mockedApi.negotiate.mock.calls[0][0];
      const callDto = mockedApi.negotiate.mock.calls[0][1];
      
      expect(callId).toBe(55);
      expect(callDto).toEqual(expect.objectContaining({
        offerPrice: 1200
      }));
    });
  });
});