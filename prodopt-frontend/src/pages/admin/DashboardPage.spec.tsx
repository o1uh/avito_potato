import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { adminApi } from '@/entities/admin/api/admin.api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';

// 1. Мокаем API
jest.mock('@/entities/admin/api/admin.api');
const mockedApi = adminApi as jest.Mocked<typeof adminApi>;

// 2. Мокаем виджеты
jest.mock('@/widgets/ArbitrationList', () => ({
  ArbitrationList: () => <div data-testid="arbitration-list">Arbitration Widget</div>
}));
jest.mock('@/widgets/ModerationList', () => ({
  ModerationList: () => <div data-testid="moderation-list">Moderation Widget</div>
}));

// 3. Мокаем права доступа
const mockUsePermission = jest.fn();
jest.mock('@/shared/lib/permissions', () => ({
  usePermission: () => mockUsePermission(),
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

describe('Page: Admin Dashboard', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('Scenario 1 (Admin): Should render dashboard, fetch stats and switch tabs', async () => {
    mockUsePermission.mockReturnValue({ isPlatformAdmin: true });
    
    mockedApi.getStats.mockResolvedValue({
      users: 100,
      companies: 50,
      successfulDeals: 200,
      activeDisputes: 5
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Проверяем статистику
    await waitFor(() => {
      expect(mockedApi.getStats).toHaveBeenCalled();
    });
    expect(await screen.findByText('100')).toBeInTheDocument(); // Users

    // 2. Проверяем дефолтный таб (Модерация)
    expect(screen.getByTestId('moderation-list')).toBeInTheDocument();
    
    // 3. Переключаем таб на Арбитраж
    // Ищем таб по тексту (включая каунтер, если он есть в моке)
    // В компоненте: `Арбитраж ${stats?.activeDisputes ? ...` -> "Арбитраж (5)"
    const tabNode = await screen.findByText(/Арбитраж/i);
    
    await act(async () => {
        fireEvent.click(tabNode);
    });

    // 4. Проверяем появление виджета Арбитража
    expect(await screen.findByTestId('arbitration-list')).toBeInTheDocument();
  });

  it('Scenario 2 (User): Should redirect to Home if not admin', async () => {
    mockUsePermission.mockReturnValue({ isPlatformAdmin: false });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    expect(mockedApi.getStats).not.toHaveBeenCalled();
  });
});