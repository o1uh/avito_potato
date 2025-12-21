import { createBrowserRouter, RouterProvider as ReactRouterProvider, Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { CompanyPage } from '@/pages/profile/CompanyPage';
import { StatsPage } from '@/pages/profile/StatsPage';
import { PartnersPage } from '@/pages/networking/PartnersPage';
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { ProductDetails } from '@/pages/catalog/ProductDetails';
import { CreateProductPage } from '@/pages/catalog/CreateProductPage';
import { DealsPage } from '@/pages/trade/DealsPage'; // <--- Добавлено
import { DealDetailsPage } from '@/pages/trade/DealDetailsPage'; // <--- Добавлено
import { useSessionStore } from '@/entities/session/model/store';
// Импортируем созданный Layout
import { MainLayout } from '@/widgets/Layout';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useSessionStore((state) => state.isAuth);
  return isAuth ? <>{children}</> : <Navigate to={ROUTES.LOGIN} />;
};

const router = createBrowserRouter([
  // --- Публичные маршруты (без шапки) ---
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },

  // --- Защищенные маршруты (с Шапкой) ---
  {
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: ROUTES.HOME,
        element: <Navigate to={ROUTES.PROFILE} />,
      },
      {
        path: ROUTES.PROFILE,
        element: <ProfilePage />,
      },
      {
        path: ROUTES.COMPANY, 
        element: <CompanyPage />,
      },
      {
        path: '/profile/stats', 
        element: <StatsPage />,
      },
      {
        path: ROUTES.PARTNERS, 
        element: <PartnersPage />,
      },
      {
        path: ROUTES.CATALOG,
        element: <CatalogPage />,
      },
      {
        path: '/catalog/create',
        element: <CreateProductPage />,
      },
      {
        path: '/catalog/:id', 
        element: <ProductDetails />,
      },
      // --- Trade Routes (Добавлено) ---
      {
        path: ROUTES.DEALS,
        element: <DealsPage />,
      },
      {
        path: '/trade/deals/:id',
        element: <DealDetailsPage />,
      },
    ]
  }
]);

export const RouterProvider = () => {
  return <ReactRouterProvider router={router} />;
};