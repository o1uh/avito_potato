import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddBankAccountForm } from './index';
import { companyApi } from '@/entities/user/api/company.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

jest.mock('@/entities/user/api/company.api');
const mockedApi = companyApi as jest.Mocked<typeof companyApi>;

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

describe('Feature: AddBankAccountForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate BIK length', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddBankAccountForm />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Добавить счет'));

    const bikInput = screen.getByLabelText(/БИК Банка/i);
    fireEvent.change(bikInput, { target: { value: '123' } });
    
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => {
      expect(screen.getByText('БИК должен содержать 9 цифр')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    mockedApi.addBankAccount.mockResolvedValue({} as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AddBankAccountForm />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Добавить счет'));

    fireEvent.change(screen.getByLabelText(/БИК Банка/i), { target: { value: '044525225' } });
    fireEvent.change(screen.getByLabelText(/Название Банка/i), { target: { value: 'Sberbank' } });
    fireEvent.change(screen.getByLabelText(/Расчетный счет/i), { target: { value: '40702810400000000001' } });
    fireEvent.change(screen.getByLabelText(/Корреспондентский счет/i), { target: { value: '30101810400000000225' } });

    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => {
      // ИСПРАВЛЕНИЕ: Проверяем аргументы вызова напрямую
      const calls = mockedApi.addBankAccount.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toEqual(expect.objectContaining({
        bankBik: '044525225',
        bankName: 'Sberbank'
      }));
    });
  });
});