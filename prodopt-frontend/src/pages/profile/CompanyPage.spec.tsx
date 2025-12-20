import { render, screen } from '@testing-library/react';
import { CompanyPage } from './CompanyPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';
import '@testing-library/jest-dom';

jest.mock('@/entities/user/api/company.api');
const mockedApi = companyApi as jest.Mocked<typeof companyApi>;

jest.mock('@/features/profile/AddBankAccountForm', () => ({
  AddBankAccountForm: () => <button>Mock Add Bank</button>
}));
jest.mock('@/features/profile/AddAddressForm', () => ({
  AddAddressForm: () => <button>Mock Add Address</button>
}));
jest.mock('@/features/team/InviteMemberModal', () => ({
  InviteMemberModal: () => <button>Mock Invite</button>
}));
jest.mock('@/features/team/MemberActions', () => ({
  MemberActions: () => <span>Actions</span>
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('Page: CompanyPage', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should render company details, bank accounts and team list', async () => {
    mockedApi.getMyCompany.mockResolvedValue({
      id: 1,
      name: 'Test Company LLC',
      inn: '7700000000',
      ogrn: '1234567890123',
      rating: 5,
      organizationTypeId: 1,
      paymentDetails: [
        { id: 10, bankName: 'Sberbank', bik: '044525225', checkingAccount: '40702...', correspondentAccount: '30101...', isPrimary: true }
      ],
      addresses: [
        { address: { id: 1, country: 'Russia', city: 'Moscow', street: 'Lenina', postalCode: '123456' }, addressType: { id: 1, name: 'Юридический' } }
      ]
    } as any);

    mockedApi.getTeam.mockResolvedValue([
      { id: 1, fullName: 'John Doe', email: 'john@test.com', roleInCompanyId: 1, isActive: true, createdAt: '' }
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <CompanyPage />
      </QueryClientProvider>
    );

    // 1. Ждем появления названия компании (Заголовок)
    expect(await screen.findByRole('heading', { name: 'Test Company LLC', level: 2 })).toBeInTheDocument();
    
    // 2. Проверяем ИНН. Используем регулярное выражение для частичного совпадения, 
    // так как текст может быть частью строки "ИНН: ... | ОГРН: ..." или находиться в ячейке таблицы.
    // getByText(/ИНН: 7700000000/) найдет строку в подзаголовке.
    expect(screen.getByText(/ИНН: 7700000000/)).toBeInTheDocument();

    // 3. Проверяем банковские счета (появится в таблице)
    expect(screen.getByText('Sberbank')).toBeInTheDocument();
    expect(screen.getByText('044525225')).toBeInTheDocument();

    // 4. Проверяем команду
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });
});